import {redirect} from '../../core/http/redirect.ts'
import {login} from '../../core/route/routes.ts'
import {FreshContext} from '$fresh/server.ts'
import {RouteState} from '../_middleware.ts'
import type {User} from '../../core/domain/user/user.types.ts'
import type {Session} from '../../core/domain/user/session.types.ts'

export interface AuthenticatedRouteState {
  user: User
  session: Session
}

export function handler(req: Request, ctx: FreshContext<RouteState>) {
  if (ctx.destination !== 'route') {
    return ctx.next()
  }

  const {user, session} = ctx.state
  if (!user || !session) {
    return redirect(login, 303)
  }

  return ctx.next()
}
