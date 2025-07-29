import {Handlers} from '$fresh/server.ts'
import {deleteSessionTokenCookie} from '../../../core/auth/session.ts'
import {redirect} from '../../../core/http/redirect.ts'
import {SessionService} from '../../../core/domain/user/session.ts'
import {login} from '../../../core/route/routes.ts'
import {RouteState} from '../../_middleware.ts'

export const handler: Handlers<void, RouteState> = {
  GET(req, ctx) {
    const headers = new Headers()
    if (ctx.state.session) {
      const sessionService = new SessionService()
      sessionService.invalidateSession(ctx.state.session.id)
      deleteSessionTokenCookie(headers)
    }
    return redirect(login, 303, headers)
  },
}
