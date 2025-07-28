import {Handlers} from '$fresh/server.ts'
import {getEmailVerificationRequestCookie} from '../../core/auth/email-verification.ts'
import {ExpiringTokenBucket} from '../../core/auth/rate-limit.ts'
import {UserService} from '../../core/domain/user.ts'
import {RouteState} from '../../core/route/state.ts'
import {EmailVerificationNotFoundError} from '../../core/domain/user.types.ts'

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30)

export const handler: Handlers<void, RouteState> = {
  POST(req, ctx) {
    const user = ctx.state.user
    if (!user) {
      const headers = new Headers()
      headers.set('location', `/login`)
      return new Response(null, {status: 303, headers})
    }
    if (!bucket.check(user.id, 1)) {
      return new Response('Too many requests', {status: 429})
    }

    const verificationId = getEmailVerificationRequestCookie(req.headers)
    if (!verificationId) {
      const headers = new Headers()
      headers.set('location', `/login`)
      return new Response(null, {status: 303, headers})
    }

    if (!bucket.consume(user.id, 1)) {
      return new Response('Too many requests', {status: 429})
    }

    const headers = new Headers()
    const userService = new UserService()
    try {
      userService.resendVerificationEmail(user, verificationId)
    } catch (err) {
      if (err instanceof EmailVerificationNotFoundError) {
        const headers = new Headers()
        headers.set('location', `/login`)
        return new Response(null, {status: 303, headers})
      }
      throw err
    }
    headers.set('location', `/verify-email?resent_to=${encodeURIComponent(user.email)}`)
    return new Response(null, {status: 303, headers})
  },
}
