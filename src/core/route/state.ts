import {Session, User} from '../domain/user/user.types.ts'

export interface RouteState {
  user?: User | null
  session?: Session | null
}
