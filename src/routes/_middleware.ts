import {FreshContext} from '$fresh/server.ts'
import {
  deleteSessionTokenCookie,
  getSessionTokenCookie,
  hasSessionTokenSetInResponse,
  setSessionTokenCookie,
} from '../core/auth/session.ts'
import {SessionService} from '../core/domain/user/session.ts'
import {User} from '../core/domain/user/user.types.ts'
import {Session} from '../core/domain/user/session.types.ts'

export interface RouteState {
  user?: User | null
  session?: Session | null
}

export async function handler(req: Request, ctx: FreshContext<RouteState>) {
  if (ctx.destination !== 'route') {
    return ctx.next()
  }

  const token = getSessionTokenCookie(req.headers)
  if (!token) {
    return ctx.next()
  }

  const sessionService = new SessionService()
  const {session, user} = sessionService.validateSessionToken(token)

  ctx.state.user = user
  ctx.state.session = session

  console.debug(`${req.method} ${req.url}`, {user})

  const res = await ctx.next()

  // validateSessionToken may have refreshed it, set cookie if necessary
  if (session) {
    // if a handler already set a session in the cookies, don't override it!
    if (!hasSessionTokenSetInResponse(res)) {
      setSessionTokenCookie(res.headers, token, session.expiresAt)
    }
  } else {
    deleteSessionTokenCookie(res.headers)
  }

  return res
}
