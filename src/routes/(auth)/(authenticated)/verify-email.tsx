import {Handlers, PageProps} from '$fresh/server.ts'
import {
  deleteEmailVerificationCookie,
  getEmailVerificationRequestCookie,
  setEmailVerificationRequestCookie,
} from '../../../core/auth/email-verification.ts'
import {ExpiringTokenBucket} from '../../../core/auth/rate-limit.ts'
import {UserService} from '../../../core/domain/user/user.ts'
import {
  EmailVerificationCodeExpiredError,
  EmailVerificationNotFoundError,
  InvalidEmailVerificationCodeError,
} from '../../../core/domain/user/user.types.ts'
import assert from 'node:assert'
import {redirect} from '../../../core/http/redirect.ts'
import {home, startJournal, verifyEmailResend} from '../../../core/route/routes.ts'
import {RouteState} from '../../_middleware.ts'
import {Button} from '../../../components/Button.tsx'
import {Error, FormField, Input, Label} from '../../../components/form/FormField.tsx'
import {UnreadEmailIcon} from '../../../components/icons.tsx'

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
    <div class="space-y-6">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          <UnreadEmailIcon class="h-8 w-8 fill-teal-600" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900">Verify your email</h1>
        <p class="mt-2 text-sm text-gray-600">
          We've sent a verification code to <span class="font-medium">{email}</span>
        </p>
      </div>

      <form method="post">
        <FormField>
          <Label for="code">Verification Code</Label>
          <Input
            type="text"
            id="code"
            name="code"
            required
            class="w-full text-center tracking-widest"
            placeholder="Enter verification code"
            autocomplete="one-time-code"
          />
          {error && <Error>{error}</Error>}
        </FormField>

        {rateLimitError && (
          <div class="mt-4 rounded-md bg-red-50 p-4">
            <p class="text-sm text-red-800">{rateLimitError}</p>
          </div>
        )}

        <Button type="submit" class="mt-4 w-full">
          Verify Email
        </Button>
      </form>

      <div class="text-center">
        {resentTo ? (
          <div class="rounded-md bg-green-50 p-4">
            <p class="text-sm text-green-800">
              A new verification code has been sent to <span class="font-medium">{resentTo}</span>
            </p>
          </div>
        ) : (
          <div class="space-y-1">
            <p class="text-sm text-gray-600">Didn't receive the code?</p>
            <form method="post" action={verifyEmailResend} class="inline">
              <Button type="submit" variant="ghost" size="sm">
                Resend verification code
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

interface VerifyEmailState {
  email: string
  resentTo?: string
  error?: string
  rateLimitError?: string
}
