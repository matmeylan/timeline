import {Handlers} from '$fresh/server.ts'
import {getEmailVerificationRequestCookie} from '../../../core/auth/email-verification.ts'
import {ExpiringTokenBucket} from '../../../core/auth/rate-limit.ts'
import {UserService} from '../../../core/domain/user/user.ts'
import {RouteState} from '../../../core/route/state.ts'
import {EmailVerificationNotFoundError} from '../../../core/domain/user/user.types.ts'
import assert from 'node:assert'
import {redirect} from '../../../core/http/redirect.ts'
import {login, verifyEmail} from '../../../core/route/routes.ts'

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30)

export const handler: Handlers<void, RouteState> = {
  POST(req, ctx) {
    const user = ctx.state.user
    assert(user, 'user not authenticated')

    if (!bucket.check(user.id, 1)) {
      return new Response('Too many requests', {status: 429})
    }

    const verificationId = getEmailVerificationRequestCookie(req.headers)
    if (!verificationId) {
      return redirect(login, 303)
    }

    if (!bucket.consume(user.id, 1)) {
      return new Response('Too many requests', {status: 429})
    }

    const userService = new UserService()
    try {
      userService.resendVerificationEmail(user, verificationId)
    } catch (err) {
      if (err instanceof EmailVerificationNotFoundError) {
        return redirect(login, 303)
      }
      throw err
    }
    return redirect(verifyEmail + `?resent_to=${encodeURIComponent(user.email)}`, 303)
  },
}
