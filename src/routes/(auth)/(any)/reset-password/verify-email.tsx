import {Handlers, PageProps} from '$fresh/server.ts'
import {Container} from '../../../../components/Container.tsx'
import {ExpiringTokenBucket} from '../../../../core/auth/rate-limit.ts'
import {RouteState} from '../../../../core/route/state.ts'
import {
  deletePasswordResetSessionTokenCookie,
  getPasswordResetSessionTokenCookie,
} from '../../../../core/auth/password.ts'
import {UserService} from '../../../../core/domain/user/user.ts'
import {redirect} from '../../../../core/http/redirect.ts'

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30)

export const handler: Handlers<VerifyEmailForPasswordResetState, RouteState> = {
  GET(req, ctx) {
    const resetToken = getPasswordResetSessionTokenCookie(req.headers)
    if (!resetToken) {
      return redirect('/forgot-password', 303)
    }
    const headers = new Headers()
    const userService = new UserService()
    const {session} = userService.validatePasswordResetSessionRequest(resetToken)
    if (!session) {
      deletePasswordResetSessionTokenCookie(headers)
      return redirect('/forgot-password', 303, headers)
    }
    if (session.emailVerified) {
      return redirect('/reset-password', 303, headers)
    }
    return ctx.render({email: session.email})
  },
  async POST(req, ctx) {
    const resetToken = getPasswordResetSessionTokenCookie(req.headers)
    if (!resetToken) {
      return redirect('/forgot-password', 303)
    }
    const userService = new UserService()
    const {session} = userService.validatePasswordResetSessionRequest(resetToken)
    if (!session) {
      return ctx.render({error: 'Invalid or missing code'}, {status: 401})
    }
    // TODO figure this out ?
    // if (session.emailVerified) {
    //   return ctx.render({email: session.email, error: 'Forbidden'}, {status: 403})
    // }
    if (!bucket.check(session.userId, 1)) {
      return ctx.render({email: session.email, rateLimitError: 'Too many requests 1'}, {status: 429})
    }

    const formData = await req.formData()
    const code = formData.get('code')?.toString()
    if (typeof code !== 'string') {
      return ctx.render({email: session.email, error: 'Invalid or missing code'}, {status: 400})
    }
    if (code === '') {
      return ctx.render({email: session.email, error: 'Please enter your code'}, {status: 400})
    }
    if (!bucket.consume(session.userId, 1)) {
      return ctx.render({email: session.email, rateLimitError: 'Too many requests 2'}, {status: 429})
    }
    if (code !== session.code) {
      return ctx.render({email: session.email, error: 'Incorrect code'}, {status: 400})
    }
    bucket.reset(session.userId)

    userService.setPasswordResetSessionAsEmailVerified(session.id)
    const emailMatches = userService.setUserAsEmailVerifiedIfEmailMatches(session.userId, session.email)
    if (!emailMatches) {
      return ctx.render({email: session.email, error: 'Incorrect code'}, {status: 400})
    }
    return redirect('/reset-password', 303)
  },
}

export default function VerifyEmailForPasswordResetPage(props: PageProps<VerifyEmailForPasswordResetState>) {
  const {error, rateLimitError} = props.data || {}
  return (
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">Verify your email address to reset your password</h1>
      <form method="post" class="mt-4 inline-flex flex-col gap-1">
        <label for="code">Code</label>
        <input id="code" name="code" required class="border border-teal-500" />
        {error && <div>{error}</div>}
        <button type="submit">Verify</button>
        {rateLimitError && <p>{rateLimitError}</p>}
      </form>
    </Container>
  )
}

export interface VerifyEmailForPasswordResetState {
  email?: string
  error?: string
  rateLimitError?: string
}
