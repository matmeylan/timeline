import {SqliteClient, isUniqueConstraintErrorForField} from '../database/sqlite.ts'
import {
  EmailVerificationRequest,
  InternalUser,
  User,
  WeakPasswordError,
  EmailAlreadyUsedError,
  Session,
  SessionFlags,
  SessionValidationResult,
  EmailVerificationNotFoundError,
  EmailVerificationCodeExpiredError,
  InvalidEmailVerificationCodeError,
  UserDoesNotExistError,
  InvalidPasswordError,
  PasswordResetSession,
  UsernameAlreadyUsedError,
} from './user.types.ts'
import {
  hashPassword,
  generateRandomRecoveryCode,
  verifyPasswordStrength,
  generateRandomOTP,
  verifyPasswordHash,
} from '../auth/password.ts'
import {encryptString} from '../auth/encryption.ts'
import {normalizeEmail} from '../serde/email.ts'
import {generateSessionToken} from '../auth/session.ts'
import {encodeBase32LowerCaseNoPadding, encodeHexLowerCase} from '@oslojs/encoding'
import {sha256} from '@oslojs/crypto/sha2'
import {subDays, addDays, addMinutes} from 'date-fns'

export class UserService {
  constructor(private readonly client: SqliteClient = new SqliteClient()) {}

  async createUser(input: {email: string; password: string; username: string; name: string}) {
    const {email: rawEmail, password} = input
    const strongPassword = verifyPasswordStrength(password)
    if (!strongPassword) {
      throw new WeakPasswordError()
    }
    const email = normalizeEmail(rawEmail)
    const passwordHash = await hashPassword(password)
    const recoveryCode = generateRandomRecoveryCode()
    const encryptedRecoveryCode = encryptString(recoveryCode)

    const user: InternalUser = {
      id: crypto.randomUUID(),
      email,
      username: input.username.trim(),
      name: input.name.trim(),
      passwordHash,
      recoveryCode: encryptedRecoveryCode,
      emailVerified: false,
      registeredTOTP: false,
      registeredPasskey: false,
      registeredSecurityKey: false,
      registered2FA: false,
    }
    const createUserStmt = this.client.db.prepare(
      `INSERT INTO user (id, email, password_hash, recovery_code, name, username)
      VALUES (:id, :email, :passwordHash, :recoveryCode, :name, :username)`,
    )
    const createUser = {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      recoveryCode: user.recoveryCode,
      username: user.username,
      name: user.name,
    }

    const {
      emailVerificationRequest,
      stmt: createEmailVerificationStmt,
      stmtValue: createEmailVerification,
    } = this.createEmailVerificationRequestForTransaction(user.id, email)

    const {
      session,
      sessionToken,
      stmt: createSessionStmt,
      stmtValue: createSession,
    } = this.createSession(user.id, {twoFactorVerified: false})

    try {
      this.client.db.transaction(() => {
        createUserStmt.run(createUser)
        createEmailVerificationStmt.run(createEmailVerification)
        createSessionStmt.run(createSession)
      })()
    } catch (err) {
      if (isUniqueConstraintErrorForField(err, 'user', 'email')) {
        throw new EmailAlreadyUsedError(email)
      } else if (isUniqueConstraintErrorForField(err, 'user', 'username')) {
        throw new UsernameAlreadyUsedError(user.username)
      }
      throw err
    }

    this.sendVerificationEmail(emailVerificationRequest.email, emailVerificationRequest.code)

    return {user: this.toExternalUser(user), session, sessionToken, emailVerificationRequest}
  }

  createEmailVerificationRequest(userId: string, email: string) {
    const {emailVerificationRequest, stmt, stmtValue} = this.createEmailVerificationRequestForTransaction(userId, email)
    stmt.run(stmtValue)
    this.sendVerificationEmail(emailVerificationRequest.email, emailVerificationRequest.code)
    return emailVerificationRequest
  }

  private createEmailVerificationRequestForTransaction(userId: string, email: string) {
    this.deleteUserEmailVerificationRequest(userId)
    const idBytes = new Uint8Array(20)
    crypto.getRandomValues(idBytes)
    const id = encodeBase32LowerCaseNoPadding(idBytes)
    const code = generateRandomOTP()
    const expiresAt = addMinutes(new Date(), 15)
    const stmt = this.client.db.prepare(
      'INSERT INTO email_verification_request (id, user_id, code, email, expires_at) VALUES (:id, :userId, :code, :email, :expiresAt)',
    )
    const stmtValue = {
      id,
      userId,
      code,
      email,
      expiresAt,
    }

    const emailVerificationRequest: EmailVerificationRequest = {
      id,
      userId,
      code,
      email,
      expiresAt,
    }

    return {emailVerificationRequest, stmt, stmtValue}
  }

  getCurrentEmailVerificationRequest(user: User, verificationId: string): EmailVerificationRequest | null {
    using stmt = this.client.db.prepare(
      'SELECT id, user_id, code, email, expires_at FROM email_verification_request WHERE id = :id AND user_id = :userId',
    )
    const request = stmt.get<EmailVerificationRequest>({id: verificationId, userId: user.id})
    if (!request || Date.now() >= new Date(request.expiresAt).getTime()) {
      return null
    }

    return request
  }

  verifyEmail(user: User, verificationId: string, verificationCode: string) {
    const request = this.getCurrentEmailVerificationRequest(user, verificationId)
    if (!request) {
      throw new EmailVerificationNotFoundError(verificationId)
    }
    if (new Date() >= new Date(request.expiresAt)) {
      throw new EmailVerificationCodeExpiredError(verificationCode)
    }
    if (request.code !== verificationCode) {
      throw new InvalidEmailVerificationCodeError(verificationCode)
    }

    this.deleteUserEmailVerificationRequest(user.id)
    this.invalidateUserPasswordResetSessions(user.id)
    this.updateUserEmailAndSetEmailAsVerified(user.id, request.email)
  }

  private updateUserEmailAndSetEmailAsVerified(userId: string, email: string): void {
    this.client.db.sql`UPDATE user SET email = ${email}, email_verified = 1 WHERE id = ${userId}`
  }

  private deleteUserEmailVerificationRequest(userId: string): void {
    this.client.db.sql`DELETE FROM email_verification_request WHERE user_id = ${userId}`
  }

  private sendVerificationEmail(email: string, code: string): void {
    console.log(`To ${email}: Your verification code is ${code}`)
  }

  private createSession(userId: string, flags: SessionFlags) {
    const token = generateSessionToken()
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
    const session: Session = {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      twoFactorVerified: flags.twoFactorVerified,
    }
    const stmt = this.client.db.prepare(
      'INSERT INTO session (id, user_id, expires_at, two_factor_verified) VALUES (:id, :userId, :expiresAt, :twoFactorVerified)',
    )
    const stmtValue = {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      twoFactorVerified: Number(session.twoFactorVerified),
    }

    return {session, sessionToken: token, stmt, stmtValue}
  }

  validateSessionToken(token: string): SessionValidationResult {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
    using stmt = this.client.db.prepare(
      `
        SELECT 
          session.id, session.user_id, session.expires_at, session.two_factor_verified, 
          user.email, user.email_verified, user.name, user.username,
          IIF(totp_credential.id IS NOT NULL, 1, 0) as registered_otp, 
          IIF(passkey_credential.id IS NOT NULL, 1, 0) as registered_passkey,  
          IIF(security_key_credential.id IS NOT NULL, 1, 0) as registered_seckey 
        FROM session
        INNER JOIN user ON session.user_id = user.id
        LEFT JOIN totp_credential ON session.user_id = totp_credential.user_id
        LEFT JOIN passkey_credential ON user.id = passkey_credential.user_id
        LEFT JOIN security_key_credential ON user.id = security_key_credential.user_id
        WHERE session.id = :sessionId
    `,
    )
    const res = stmt.get<{
      id: string
      user_id: string
      expires_at: string
      two_factor_verified: number
      email: string
      email_verified: number
      name: string
      username: string
      registered_otp: boolean
      registered_passkey: boolean
      registered_seckey: boolean
    }>({sessionId})
    if (!res) {
      return {session: null, user: null}
    }

    const session: Session = {
      id: res.id,
      userId: res.user_id,
      expiresAt: new Date(res.expires_at),
      twoFactorVerified: Boolean(res.two_factor_verified),
    }
    const user: User = {
      id: res.user_id,
      email: res.email,
      username: res.username,
      name: res.name,
      emailVerified: Boolean(res.email_verified),
      registeredTOTP: Boolean(res.registered_otp),
      registeredPasskey: Boolean(res.registered_passkey),
      registeredSecurityKey: Boolean(res.registered_seckey),
      registered2FA: false,
    }
    if (user.registeredPasskey || user.registeredSecurityKey || user.registeredTOTP) {
      user.registered2FA = true
    }
    const now = new Date()
    if (now >= new Date(session.expiresAt)) {
      this.client.db.sql`DELETE FROM session WHERE id = ${session.id}`
      return {session: null, user: null}
    }
    if (now >= subDays(new Date(session.expiresAt), 15)) {
      // extend session
      session.expiresAt = addDays(now, 30)
      this.client.db.exec('UPDATE session SET expires_at = :expiration WHERE session.id = :sessionId', {
        expiration: session.expiresAt,
        sessionId,
      })
    }
    return {session, user}
  }

  invalidateSession(sessionId: string) {
    this.client.db.sql`DELETE FROM session WHERE id = ${sessionId}`
  }

  private invalidateUserSessions(userId: string): void {
    this.client.db.sql`DELETE FROM session WHERE user_id = ${userId}`
  }

  getUserByEmail(email: string): User {
    const stmt = this.client.db.prepare(
      `SELECT user.id, user.email, user.email_verified, user.username, user.name, IIF(totp_credential.id IS NOT NULL, 1, 0), IIF(passkey_credential.id IS NOT NULL, 1, 0), IIF(security_key_credential.id IS NOT NULL, 1, 0) 
        FROM user
        LEFT JOIN totp_credential ON user.id = totp_credential.user_id
        LEFT JOIN passkey_credential ON user.id = passkey_credential.user_id
        LEFT JOIN security_key_credential ON user.id = security_key_credential.user_id
        WHERE user.email = :email`,
    )

    const res = stmt.get<{
      id: string
      email: string
      email_verified: number
      username: string
      name: string
      registered_otp: boolean
      registered_passkey: boolean
      registered_seckey: boolean
    }>({email})

    if (!res) {
      throw new UserDoesNotExistError(email)
    }

    const user: User = {
      id: res.id,
      email: res.email,
      emailVerified: Boolean(res.email_verified),
      username: res.username,
      name: res.name,
      registeredTOTP: Boolean(res.registered_otp),
      registeredPasskey: Boolean(res.registered_passkey),
      registeredSecurityKey: Boolean(res.registered_seckey),
      registered2FA: false,
    }
    if (user.registeredPasskey || user.registeredSecurityKey || user.registeredTOTP) {
      user.registered2FA = true
    }
    return user
  }

  async validateUserPassword(user: User, password: string) {
    const getPasswordStmt = this.client.db.prepare('SELECT password_hash FROM user WHERE id = :userId')
    const res = getPasswordStmt.get<{password_hash: string}>({userId: user.id})
    if (!res) {
      throw new UserDoesNotExistError(user.email)
    }
    const isValid = await verifyPasswordHash(res.password_hash, password)
    if (!isValid) {
      throw new InvalidPasswordError()
    }

    const {session, sessionToken, stmt, stmtValue} = this.createSession(user.id, {twoFactorVerified: false})
    stmt.run(stmtValue)

    return {session, sessionToken}
  }

  forgotPassword(user: User) {
    this.client.db.sql`DELETE FROM password_reset_session WHERE user_id = ${user.id}`

    const sessionToken = generateSessionToken()
    const session = this.createPasswordResetSession(sessionToken, user.id, user.email)
    this.sendPasswordResetEmail(session.email, session.code)

    return {session, sessionToken}
  }

  private createPasswordResetSession(token: string, userId: string, email: string) {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
    const session: PasswordResetSession = {
      id: sessionId,
      userId,
      email,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      code: generateRandomOTP(),
      emailVerified: false,
    }
    using stmt = this.client.db.prepare(
      'INSERT INTO password_reset_session (id, user_id, email, code, expires_at) VALUES (:id, :userId, :email, :code, :expiresAt)',
    )
    stmt.run({
      id: session.id,
      userId: session.userId,
      email: session.email,
      code: session.code,
      expiresAt: session.expiresAt,
    })
    return session
  }

  private sendPasswordResetEmail(email: string, code: string): void {
    console.log(`To ${email}: Your reset code is ${code}`)
  }

  validatePasswordResetSessionRequest(token: string) {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
    using stmt = this.client.db.prepare(
      `
      SELECT 
        password_reset_session.id, password_reset_session.user_id, password_reset_session.email, password_reset_session.code, password_reset_session.expires_at, password_reset_session.email_verified,
        user.email_verified as user_email_verified, user.name, user.username,
        IIF(totp_credential.id IS NOT NULL, 1, 0) as registered_otp, 
        IIF(passkey_credential.id IS NOT NULL, 1, 0) as registered_passkey,  
        IIF(security_key_credential.id IS NOT NULL, 1, 0) as registered_seckey 
      FROM password_reset_session
      INNER JOIN user ON password_reset_session.user_id = user.id
      LEFT JOIN totp_credential ON user.id = totp_credential.user_id
      LEFT JOIN passkey_credential ON user.id = passkey_credential.user_id
      LEFT JOIN security_key_credential ON user.id = security_key_credential.user_id
      WHERE password_reset_session.id = :sessionId
      `,
    )
    const res = stmt.get<{
      id: string
      user_id: string
      email: string
      code: string
      expires_at: string
      email_verified: number
      name: string
      username: string
      user_email_verified: number
      registered_otp: boolean
      registered_passkey: boolean
      registered_seckey: boolean
    }>({sessionId})
    if (!res) {
      return {session: null, user: null}
    }
    const session: PasswordResetSession = {
      id: res.id,
      userId: res.user_id,
      email: res.email,
      code: res.code,
      expiresAt: new Date(res.expires_at),
      emailVerified: Boolean(res.email_verified),
    }
    const user: User = {
      id: res.user_id,
      email: res.email,
      name: res.name,
      username: res.username,
      emailVerified: Boolean(res.user_email_verified),
      registeredTOTP: Boolean(res.registered_otp),
      registeredPasskey: Boolean(res.registered_passkey),
      registeredSecurityKey: Boolean(res.registered_seckey),
      registered2FA: false,
    }
    if (user.registeredPasskey || user.registeredSecurityKey || user.registeredTOTP) {
      user.registered2FA = true
    }
    if (new Date() >= new Date(session.expiresAt)) {
      this.client.db.sql`DELETE FROM password_reset_session WHERE id = ${session.id}`
      return {session: null, user: null}
    }
    return {session, user}
  }

  private invalidateUserPasswordResetSessions(userId: string): void {
    this.client.db.sql`DELETE FROM password_reset_session WHERE user_id = ${userId}`
  }

  setPasswordResetSessionAsEmailVerified(sessionId: string): void {
    this.client.db.sql`UPDATE password_reset_session SET email_verified = 1 WHERE id = ${sessionId}`
  }

  setUserAsEmailVerifiedIfEmailMatches(userId: string, email: string): boolean {
    using stmt = this.client.db.prepare('UPDATE user SET email_verified = 1 WHERE id = :userId AND email = :email')
    return stmt.run({userId, email}) > 0
  }

  async resetPassword(userId: string, newPassword: string) {
    const strongPassword = verifyPasswordStrength(newPassword)
    if (!strongPassword) {
      throw new WeakPasswordError()
    }

    this.invalidateUserPasswordResetSessions(userId)
    this.invalidateUserSessions(userId)
    const passwordHash = await hashPassword(newPassword)
    this.client.db.sql`UPDATE user SET password_hash = ${passwordHash} WHERE id = ${userId}`

    const {session, sessionToken, stmt, stmtValue} = this.createSession(userId, {twoFactorVerified: false})
    stmt.run(stmtValue)
    return {session, sessionToken}
  }

  private toExternalUser(internal: InternalUser): User {
    return {
      id: internal.email,
      email: internal.email,
      emailVerified: internal.emailVerified,
      username: internal.username,
      name: internal.name,
      registeredTOTP: internal.registeredTOTP,
      registeredPasskey: internal.registeredPasskey,
      registeredSecurityKey: internal.registeredSecurityKey,
      registered2FA: internal.registered2FA,
    }
  }
}
