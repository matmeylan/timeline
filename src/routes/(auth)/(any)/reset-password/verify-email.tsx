import {Handlers, PageProps} from '$fresh/server.ts'
import {ExpiringTokenBucket} from '../../../../core/auth/rate-limit.ts'
import {
  deletePasswordResetSessionTokenCookie,
  getPasswordResetSessionTokenCookie,
} from '../../../../core/auth/password.ts'
import {UserService} from '../../../../core/domain/user/user.ts'
import {redirect} from '../../../../core/http/redirect.ts'
import {forgotPassword, resetPassword} from '../../../../core/route/routes.ts'
import {RouteState} from '../../../_middleware.ts'
import {Button} from '../../../../components/Button.tsx'
import {Error, FormField, Input, Label} from '../../../../components/form/FormField.tsx'
import {UnreadEmailIcon} from '../../../../components/icons.tsx'

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30)

export const handler: Handlers<VerifyEmailForPasswordResetState, RouteState> = {
  GET(req, ctx) {
    const resetToken = getPasswordResetSessionTokenCookie(req.headers)
    if (!resetToken) {
      return redirect(forgotPassword, 303)
    }
    const headers = new Headers()
    const userService = new UserService()
    const {session} = userService.validatePasswordResetSessionRequest(resetToken)
    if (!session) {
      deletePasswordResetSessionTokenCookie(headers)
      return redirect(forgotPassword, 303, headers)
    }
    if (session.emailVerified) {
      return redirect(resetPassword, 303, headers)
    }
    return ctx.render({email: session.email})
  },
  async POST(req, ctx) {
    const resetToken = getPasswordResetSessionTokenCookie(req.headers)
    if (!resetToken) {
      return redirect(forgotPassword, 303)
    }
    const userService = new UserService()
    const {session} = userService.validatePasswordResetSessionRequest(resetToken)
    if (!session) {
      return ctx.render({error: 'Invalid or missing code'}, {status: 401})
    }
    if (session.emailVerified) {
      return ctx.render({email: session.email, error: 'Forbidden'}, {status: 403})
    }
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

    const emailMatches = userService.setUserAsEmailVerified(session.id, session.userId, session.email)
    if (!emailMatches) {
      return ctx.render({email: session.email, error: 'Incorrect code'}, {status: 400})
    }
    return redirect(resetPassword, 303)
  },
}

export default function VerifyEmailForPasswordResetPage(props: PageProps<VerifyEmailForPasswordResetState>) {
  const {email, error, rateLimitError} = props.data || {}
  return (
    <div class="space-y-6">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          <UnreadEmailIcon class="h-8 w-8 fill-teal-600" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900">Verify your email</h1>
        <p class="mt-2 text-sm text-gray-600">
          {email ? (
            <>
              We've sent a verification code to <span class="font-medium">{email}</span>
            </>
          ) : (
            'Please enter the verification code to reset your password'
          )}
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
    </div>
  )
}

export interface VerifyEmailForPasswordResetState {
  email?: string
  error?: string
  rateLimitError?: string
}
