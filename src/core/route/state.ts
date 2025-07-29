import {User} from '../domain/user/user.types.ts'
import {Session} from '../domain/user/session.types.ts'

export interface RouteState {
  user?: User | null
  session?: Session | null
}

export interface AuthenticatedRouteState {
  user: User
  session: Session
}
