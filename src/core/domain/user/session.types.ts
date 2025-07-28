import {User} from './user.types.ts'

export interface SessionFlags {
  twoFactorVerified: boolean
}

export interface Session extends SessionFlags {
  id: string
  expiresAt: Date | string
  userId: string
}

export type SessionValidationResult = {session: Session; user: User} | {session: null; user: null}
