import {FreshContext} from '$fresh/server.ts'
import {deleteSessionTokenCookie, getSessionTokenCookie, setSessionTokenCookie} from '../core/auth/session.ts'
import {UserService} from '../core/domain/user.ts'
import {RouteState} from '../core/route/state.ts'

export async function handler(req: Request, ctx: FreshContext<RouteState>) {
  if (ctx.destination !== 'route') {
    return ctx.next()
  }

  const token = getSessionTokenCookie(req.headers)
  if (!token) {
    return ctx.next()
  }

  const userService = new UserService()
  const {session, user} = userService.validateSessionToken(token)

  ctx.state.user = user
  ctx.state.session = session

  console.log({user, session})

  const res = await ctx.next()

  // validateSessionToken may have refreshed it
  if (session) {
    setSessionTokenCookie(res.headers, token, session.expiresAt)
  } else {
    deleteSessionTokenCookie(res.headers)
  }

  return res
}
