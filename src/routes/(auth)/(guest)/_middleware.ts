import {RouteState} from '../../../core/route/state.ts'
import {FreshContext} from '$fresh/server.ts'
import {redirect} from '../../../core/http/redirect.ts'

export function handler(req: Request, ctx: FreshContext<RouteState>) {
  if (ctx.destination !== 'route') {
    return ctx.next()
  }

  // if already logged in, redirect to home page as this space is only for logged out users
  const {user} = ctx.state
  if (user) {
    if (user.emailVerified) {
      return redirect('/', 303)
    } else {
      return redirect('/verify-email', 303)
    }
  }

  return ctx.next()
}
