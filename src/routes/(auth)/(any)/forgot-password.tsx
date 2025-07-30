import {Handlers, PageProps} from '$fresh/server.ts'
import z, {ZodError} from '@zod/zod'
import {RefillingTokenBucket} from '../../../core/auth/rate-limit.ts'
import {EMAIL_VALIDATION_PATTERN} from '../../../core/serde/email.ts'
import {UserDoesNotExistError} from '../../../core/domain/user/user.types.ts'
import {UserService} from '../../../core/domain/user/user.ts'
import {setPasswordResetSessionTokenCookie} from '../../../core/auth/password.ts'
import {redirect} from '../../../core/http/redirect.ts'
import {login, resetPasswordVerifyEmail, signup} from '../../../core/route/routes.ts'
import {RouteState} from '../../_middleware.ts'
import {Button} from '../../../components/Button.tsx'
import {Error, FormField, Input, Label} from '../../../components/form/FormField.tsx'
import {Link} from '../../../components/Link.tsx'
import {KeyIcon} from '../../../components/icons.tsx'

const ipBucket = new RefillingTokenBucket<string>(3, 60)
const userBucket = new RefillingTokenBucket<string>(3, 60)

export const handler: Handlers<ForgotPasswordState, RouteState> = {
  GET(req, ctx) {
    const url = new URL(req.url)
    const email = decodeURIComponent(url.searchParams.get('email') || '')
    return ctx.render({form: {email}})
  },
  async POST(req, ctx) {
    // TODO: Assumes X-Forwarded-For is always included.
    const clientIP = req.headers.get('X-Forwarded-For')
    if (clientIP !== null && !ipBucket.check(clientIP, 1)) {
      return ctx.render({rateLimitError: 'Too many requests'}, {status: 429})
    }

    const formData = await req.formData()
    const email = formData.get('email')?.toString()
    const form = {email}

    const result = ForgotPasswordSchema.safeParse(form)
    if (!result.success) {
      return ctx.render({error: result.error, form}, {status: 400})
    }

    try {
      const userService = new UserService()
      const user = userService.getUserByEmail(result.data.email)

      if (clientIP !== null && !ipBucket.consume(clientIP, 1)) {
        return ctx.render({rateLimitError: 'Too many requests'}, {status: 429})
      }
      if (!userBucket.consume(user.id, 1)) {
        return ctx.render({rateLimitError: 'Too many requests'}, {status: 429})
      }
      const {session, sessionToken} = userService.forgotPassword(user)

      const headers = new Headers()
      setPasswordResetSessionTokenCookie(headers, sessionToken, session.expiresAt)
      return redirect(resetPasswordVerifyEmail, 303, headers)
    } catch (err) {
      if (err instanceof UserDoesNotExistError) {
        return ctx.render({error: err.toZod(), form}, {status: 400})
      }
      throw err
    }
  },
}

export default function ForgotPasswordPage(props: PageProps<ForgotPasswordState>) {
  const {error, form, rateLimitError} = props.data || {}
  const errors = error ? z.flattenError(error) : undefined

  return (
    <div class="space-y-6">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          <KeyIcon class="h-8 w-8 fill-teal-600" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900">Forgot your password?</h1>
        <p class="mt-2 text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      <form method="post">
        <FormField>
          <Label for="email">Email Address</Label>
          <Input
            type="email"
            id="email"
            name="email"
            autocomplete="username"
            required
            value={form?.email ?? ''}
            class="w-full"
            placeholder="Enter your email"
          />
          {errors?.fieldErrors.email && <Error>{errors.fieldErrors.email}</Error>}
        </FormField>

        {rateLimitError && (
          <div class="mt-4 rounded-md bg-red-50 p-4">
            <p class="text-sm text-red-800">{rateLimitError}</p>
          </div>
        )}

        <Button type="submit" class="mt-4 w-full">
          Send Reset Link
        </Button>
      </form>

      <section class="text-sm text-gray-600">
        <p>
          Don't have an account? <Link href={signup + '?email=' + encodeURIComponent(form?.email || '')}>Sign up</Link>
        </p>
        <p>
          Remember your password?{' '}
          <Link href={login + '?email=' + encodeURIComponent(form?.email || '')}>Back to Sign In</Link>
        </p>
      </section>
    </div>
  )
}

export interface ForgotPasswordState {
  form?: {
    email?: string
  }
  error?: ForgotPasswordSchemaError
  rateLimitError?: string
}

const ForgotPasswordSchema = z.object({
  email: z.email({pattern: EMAIL_VALIDATION_PATTERN}).min(1),
})
export type ForgotPasswordSchemaInput = z.infer<typeof ForgotPasswordSchema>
type ForgotPasswordSchemaError = ZodError<ForgotPasswordSchemaInput>
