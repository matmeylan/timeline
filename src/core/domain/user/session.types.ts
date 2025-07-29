import {User} from './user.types.ts'

export interface Session {
  id: string
  expiresAt: Date | string
  userId: string
}

export type SessionValidationResult = {session: Session; user: User} | {session: null; user: null}
