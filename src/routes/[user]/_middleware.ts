import {RouteState} from '../../core/route/state.ts'
import {redirect} from '../../core/http/redirect.ts'
import {login} from '../../core/route/routes.ts'
import {FreshContext} from '$fresh/server.ts'

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
