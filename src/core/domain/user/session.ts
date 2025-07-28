import {Session, SessionFlags, SessionValidationResult} from './session.types.ts'
import {generateSessionToken} from '../../auth/session.ts'
import {encodeHexLowerCase} from '@oslojs/encoding'
import {sha256} from '@oslojs/crypto/sha2'
import {SqliteClient} from '../../database/sqlite.ts'
import {User} from './user.types.ts'
import {addDays, subDays} from 'date-fns'

export class SessionService {
  constructor(private readonly client: SqliteClient = new SqliteClient()) {}

  createSessionForTransaction(userId: string, flags: SessionFlags) {
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

  createSession(userId: string, flags: SessionFlags) {
    const {session, sessionToken, stmt, stmtValue} = this.createSessionForTransaction(userId, flags)
    stmt.run(stmtValue) // run the query, no transaction needed here
    return {session, sessionToken}
  }

  validateSessionToken(token: string): SessionValidationResult {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
    using stmt = this.client.db.prepare(
      `
        SELECT 
          session.id, session.user_id, session.expires_at, session.two_factor_verified, 
          user.email, user.email_verified, user.name, user.username,
          IIF(passkey_credential.id IS NOT NULL, 1, 0) as registered_passkey
        FROM session
        INNER JOIN user ON session.user_id = user.id
        LEFT JOIN passkey_credential ON user.id = passkey_credential.user_id
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
      registered_passkey: boolean
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
      registeredPasskey: Boolean(res.registered_passkey),
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

  setSessionAs2FAVerified(sessionId: string): void {
    this.client.db.sql`UPDATE session SET two_factor_verified = 1 WHERE id = ${sessionId}`
  }

  invalidateSession(sessionId: string) {
    this.client.db.sql`DELETE FROM session WHERE id = ${sessionId}`
  }

  invalidateUserSessions(userId: string): void {
    this.client.db.sql`DELETE FROM session WHERE user_id = ${userId}`
  }
}
