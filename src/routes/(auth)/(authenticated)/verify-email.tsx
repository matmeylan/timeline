import {Handlers, PageProps} from '$fresh/server.ts'
import {Container} from '../../../components/Container.tsx'
import {
  deleteEmailVerificationCookie,
  getEmailVerificationRequestCookie,
  setEmailVerificationRequestCookie,
} from '../../../core/auth/email-verification.ts'
import {ExpiringTokenBucket} from '../../../core/auth/rate-limit.ts'
import {UserService} from '../../../core/domain/user/user.ts'
import {RouteState} from '../../../core/route/state.ts'
import {
  EmailVerificationCodeExpiredError,
  EmailVerificationNotFoundError,
  InvalidEmailVerificationCodeError,
} from '../../../core/domain/user/user.types.ts'
import assert from 'node:assert'
import {redirect} from '../../../core/http/redirect.ts'
import {home, startJournal, verifyEmailResend} from '../../../core/route/routes.ts'

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30)

export const handler: Handlers<VerifyEmailState, RouteState> = {
  GET(req, ctx) {
    const user = ctx.state.user
    assert(user, 'user not authenticated')

    // already verified ?
    if (user.emailVerified) {
      return redirect(home, 303)
    }

    const headers = new Headers()
    const userService = new UserService()
    const verificationId = getEmailVerificationRequestCookie(req.headers)
    let request = verificationId ? userService.getCurrentEmailVerificationRequest(user, verificationId) : undefined
    if (!request) {
      request = userService.createEmailVerificationRequest(user.id, user.email)
      setEmailVerificationRequestCookie(headers, request)
    }

    const resentTo = new URL(req.url).searchParams.get('resent_to')
    return ctx.render({email: request.email, resentTo: resentTo ? decodeURIComponent(resentTo) : undefined})
  },
  async POST(req, ctx) {
    const user = ctx.state.user
    assert(user, 'user not authenticated')

    if (!bucket.check(user.id, 1)) {
      return ctx.render({email: user.email, rateLimitError: 'Too many requests'}, {status: 429})
    }

    const verificationId = getEmailVerificationRequestCookie(req.headers)
    if (!verificationId) {
      return ctx.render({email: user.email, error: 'Invalid or missing code'}, {status: 400})
    }

    const formData = await req.formData()
    const code = formData.get('code')?.toString()
    if (typeof code !== 'string') {
      return ctx.render({email: user.email, error: 'Invalid or missing code'}, {status: 400})
    }
    if (code === '') {
      return ctx.render({email: user.email, error: 'Please enter your code'}, {status: 400})
    }
    if (!bucket.consume(user.id, 1)) {
      return ctx.render({email: user.email, rateLimitError: 'Too many requests'}, {status: 429})
    }

    const headers = new Headers()
    const userService = new UserService()
    try {
      userService.verifyEmail(user, verificationId, code)
    } catch (err) {
      if (err instanceof EmailVerificationNotFoundError) {
        return ctx.render({email: user.email, error: 'Invalid code'}, {status: 401})
      } else if (err instanceof InvalidEmailVerificationCodeError) {
        return ctx.render({email: user.email, error: 'The code you have entered is incorrect.'}, {status: 400})
      } else if (err instanceof EmailVerificationCodeExpiredError) {
        // send new code
        const newRequest = userService.createEmailVerificationRequest(user.id, user.email)
        setEmailVerificationRequestCookie(headers, newRequest)
        return ctx.render(
          {email: user.email, error: `The code has expired. We have sent you a new code to ${user.email}`},
          {status: 400},
        )
      } else {
        throw err
      }
    }

    // verified, we can get rid of the cookie
    deleteEmailVerificationCookie(headers)

    return redirect(startJournal(user.username), 303, headers)
  },
}

export default function VerifyEmailPage(props: PageProps<VerifyEmailState>) {
  const {email, error, rateLimitError, resentTo} = props.data
  return (
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">Verify your email</h1>
      <p>Check your email! We've sent a code to you on "{email}"</p>
      <form method="post" class="mt-4 inline-flex flex-col gap-1">
        <label for="form-verify.code">Code</label>
        <input id="form-verify.code" name="code" required class="border border-teal-500" />
        {error && <div>{error}</div>}
        <button type="submit">Verify</button>
        {rateLimitError && <p>{rateLimitError}</p>}
      </form>
      <div class="mt-4">
        {resentTo ? (
          <p>A code has been resent to {resentTo}</p>
        ) : (
          <form method="post" action={verifyEmailResend}>
            <button type="submit">Resend code</button>
          </form>
        )}
      </div>
    </Container>
  )
}

interface VerifyEmailState {
  email: string
  resentTo?: string
  error?: string
  rateLimitError?: string
}
