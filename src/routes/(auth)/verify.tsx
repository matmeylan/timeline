import {Handlers, PageProps} from '$fresh/server.ts'
import {Container} from '../../components/Container.tsx'
import {
  deleteEmailVerificationCookie,
  getEmailVerificationRequestCookie,
  setEmailVerificationRequestCookie,
} from '../../core/auth/email-verification.ts'
import {ExpiringTokenBucket} from '../../core/auth/rate-limit.ts'
import {UserService} from '../../core/domain/user.ts'
import {RouteState} from '../../core/route/state.ts'
import {
  EmailVerificationCodeExpiredError,
  EmailVerificationNotFoundError,
  InvalidEmailVerificationCodeError,
} from '../../core/domain/user.types.ts'

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30)

export const handler: Handlers<VerifyEmailState, RouteState> = {
  GET(req, ctx) {
    const user = ctx.state.user
    if (!user) {
      const headers = new Headers()
      headers.set('location', `/login`)
      return new Response(null, {status: 303, headers})
    }
    if (user.emailVerified) {
      const headers = new Headers()
      headers.set('location', `/`)
      return new Response(null, {status: 303, headers})
    }

    const headers = new Headers()
    const userService = new UserService()
    const verificationId = getEmailVerificationRequestCookie(req.headers)
    let request = verificationId ? userService.getCurrentEmailVerificationRequest(user, verificationId) : undefined
    if (!request) {
      request = userService.createEmailVerificationRequest(user.id, user.email)
      setEmailVerificationRequestCookie(headers, request)
    }

    return ctx.render({email: request.email})
  },
  async POST(req, ctx) {
    const user = ctx.state.user
    if (!user) {
      const headers = new Headers()
      headers.set('location', `/login`)
      return new Response(null, {status: 303, headers})
    }
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

    headers.set('location', `/`)
    return new Response(null, {status: 303, headers})
  },
}

export default function Verify(props: PageProps<VerifyEmailState>) {
  const {email, error, rateLimitError} = props.data
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
      <div>
        <a class="mt-4" href="/verify-resend">
          Resend code (TODO and rename to verify-email)
        </a>
      </div>
    </Container>
  )
}

interface VerifyEmailState {
  email: string
  error?: string
  rateLimitError?: string
}
