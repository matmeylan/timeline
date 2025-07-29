import {RouteState} from '../../../core/route/state.ts'
import {FreshContext} from '$fresh/server.ts'
import {redirect} from '../../../core/http/redirect.ts'
import {login} from '../../../core/route/routes.ts'

export function handler(req: Request, ctx: FreshContext<RouteState>) {
  if (ctx.destination !== 'route') {
    return ctx.next()
  }

  const {user} = ctx.state
  if (!user) {
    return redirect(login, 303)
  }

  return ctx.next()
}
