import {Handlers} from '$fresh/server.ts'
import {UserService} from '../../core/domain/user.ts'
import {RouteState} from '../../core/route/state.ts'
import {deleteSessionTokenCookie} from '../../core/auth/session.ts'
export const handler: Handlers<void, RouteState> = {
  GET(req, ctx) {
    const headers = new Headers()
    if (ctx.state.session) {
      const userService = new UserService()
      userService.invalidateSession(ctx.state.session.id)
      deleteSessionTokenCookie(headers)
    }
    headers.set('location', `/login`)
    return new Response(null, {status: 303, headers})
  },
}
