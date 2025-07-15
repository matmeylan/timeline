import {ZodError} from '@zod/zod'
import {Zodable} from '../serde/zod.ts'
import {LoginSchemaInput} from '../../routes/(auth)/login.tsx'
import {SignupSchemaInput} from '../../routes/(auth)/signup.tsx'

export interface User {
  id: string
  email: string
  emailVerified: boolean
  registeredTOTP: boolean
  registeredSecurityKey: boolean
  registeredPasskey: boolean
  registered2FA: boolean
}

export interface InternalUser extends User {
  passwordHash: string
  recoveryCode: Uint8Array
}

export interface EmailVerificationRequest {
  id: string
  userId: string
  code: string
  email: string
  expiresAt: Date | string
}

export interface SessionFlags {
  twoFactorVerified: boolean
}

export interface Session extends SessionFlags {
  id: string
  expiresAt: Date | string
  userId: string
}

export type SessionValidationResult = {session: Session; user: User} | {session: null; user: null}

export class WeakPasswordError extends Error implements Zodable<{password: string}> {
  constructor() {
    super(
      `Password is too weak and seems to appear in online databases - Please use another password and change in accounts where you are using it.`,
    )
  }

  toZod() {
    return new ZodError([{input: '****', code: 'custom', path: ['password'], message: this.message}]) as ZodError<{
      password: string
    }>
  }
}

export class EmailAlreadyUsedError extends Error implements Zodable<SignupSchemaInput> {
  constructor(private readonly email: string) {
    super(`Email ${email} is already linked to an account. Did you mean to login ?`)
  }

  toZod() {
    return new ZodError([
      {input: this.email, code: 'custom', path: ['email'], message: this.message},
    ]) as ZodError<SignupSchemaInput>
  }
}

export class UserDoesNotExistError extends Error implements Zodable<LoginSchemaInput> {
  constructor(private readonly email: string) {
    super(`User with email ${email} does not exist. Did you mean to sign-up ?`)
  }

  toZod() {
    return new ZodError([
      {input: this.email, code: 'custom', path: ['email'], message: this.message},
    ]) as ZodError<LoginSchemaInput>
  }
}

export class InvalidPasswordError extends Error implements Zodable<LoginSchemaInput> {
  constructor() {
    super(`Password is not correct.`)
  }

  toZod() {
    return new ZodError([
      {input: '****', code: 'custom', path: ['password'], message: this.message},
    ]) as ZodError<LoginSchemaInput>
  }
}

export class EmailVerificationNotFoundError extends Error {
  constructor(verificationId: string) {
    super(`Email verification id ${verificationId} not found`)
  }
}

export class EmailVerificationCodeExpiredError extends Error {
  constructor(code: string) {
    super(`Email verification code ${code} has expired`)
  }
}

export class InvalidEmailVerificationCodeError extends Error {
  constructor(code: string) {
    super(`Email verification code ${code} is invalid`)
  }
}

/*
    const session: Session = {
      id: row.string(0),
      userId: row.number(1),
      expiresAt: new Date(row.number(2) * 1000),
      twoFactorVerified: Boolean(row.number(3)),
    }
    const user: User = {
      id: row.number(4),
      email: row.string(5),
      username: row.string(6),
      emailVerified: Boolean(row.number(7)),
      registeredTOTP: Boolean(row.number(8)),
      registeredPasskey: Boolean(row.number(9)),
      registeredSecurityKey: Boolean(row.number(10)),
      registered2FA: false,
    }
      */
