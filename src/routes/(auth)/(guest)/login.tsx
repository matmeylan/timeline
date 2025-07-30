import {Handlers, PageProps} from '$fresh/server.ts'
import {z, ZodError} from '@zod/zod'
import {RefillingTokenBucket, Throttler} from '../../../core/auth/rate-limit.ts'
import {UserService} from '../../../core/domain/user/user.ts'
import {setSessionTokenCookie} from '../../../core/auth/session.ts'
import {redirect} from '../../../core/http/redirect.ts'
import {forgotPassword, userHome, signup, verifyEmail} from '../../../core/route/routes.ts'
import {InvalidPasswordError, UserDoesNotExistError} from '../../../core/domain/user/user.types.ts'
import LoginWithPasskeyButton from '../../../islands/auth/login-with-passkey-button.tsx'
import {EMAIL_VALIDATION_PATTERN} from '../../../core/serde/email.ts'
import {RouteState} from '../../_middleware.ts'
import {Error, FormField, Input, Label} from '../../../components/form/FormField.tsx'
import {Link} from '../../../components/Link.tsx'
import {Button} from '../../../components/Button.tsx'

const throttler = new Throttler<string>([0, 1, 2, 4, 8, 16, 30, 60, 180, 300])
const ipBucket = new RefillingTokenBucket<string>(20, 1)

export const handler: Handlers<LoginState, RouteState> = {
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
    const password = formData.get('password')?.toString()
    const form = {
      email,
      password,
    }
    const result = LoginSchema.safeParse(form)
    if (!result.success) {
      return ctx.render({error: result.error, form}, {status: 400})
    }

    try {
      const userService = new UserService()
      const user = userService.getUserByEmail(result.data.email)
      if (clientIP !== null && !ipBucket.consume(clientIP, 1)) {
        return ctx.render({rateLimitError: 'Too many requests'}, {status: 429})
      }
      if (!throttler.consume(user.id)) {
        return ctx.render({rateLimitError: 'Too many requests'}, {status: 429})
      }

      const {session, sessionToken} = await userService.validateUserPassword(user, result.data.password)
      throttler.reset(user.id)
      const headers = new Headers()
      setSessionTokenCookie(headers, sessionToken, session.expiresAt)

      if (!user.emailVerified) {
        return redirect(verifyEmail, 303, headers)
      }
      return redirect(userHome(user.username), 303, headers)
    } catch (err) {
      if (err instanceof UserDoesNotExistError) {
        return ctx.render({error: err.toZod(), form}, {status: 400})
      } else if (err instanceof InvalidPasswordError) {
        return ctx.render({error: err.toZod(), form}, {status: 400})
      }
      throw err
    }
  },
}

export default function LoginPage(props: PageProps<LoginState>) {
  const {error, form, rateLimitError} = props.data || {}
  const errors = error ? z.flattenError(error) : undefined

  return (
    <div class="space-y-6">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Welcome back</h1>
        <p class="mt-2 text-sm text-gray-600">Sign in to your account to continue</p>
      </div>

      <form method="post">
        <div class="flex flex-col gap-4">
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
          <FormField>
            <Label for="password">Password</Label>
            <Input
              type="password"
              id="password"
              name="password"
              autocomplete="current-password"
              required
              value={form?.password ?? ''}
              class="w-full"
              placeholder="Enter your password"
            />
            {errors?.fieldErrors.password && <Error>{errors.fieldErrors.password}</Error>}
          </FormField>

          <div class="flex items-center justify-end text-sm">
            <Link href={forgotPassword + '?email=' + encodeURIComponent(form?.email || '')}>Forgot your password?</Link>
          </div>
        </div>

        {rateLimitError && (
          <div class="rounded-md bg-red-50 p-4">
            <p class="text-sm text-red-800">{rateLimitError}</p>
          </div>
        )}

        <Button type="submit" class="mt-4 w-full">
          Sign In
        </Button>
      </form>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-white px-2 text-gray-500">or continue with</span>
        </div>
      </div>

      <LoginWithPasskeyButton />

      <div class="text-center">
        <p class="text-sm text-gray-600">
          Don't have an account? <Link href={signup + '?email=' + encodeURIComponent(form?.email || '')}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

interface LoginState {
  form?: Form
  error?: LoginSchemaError
  rateLimitError?: string
}

interface Form {
  email?: string
  password?: string
}

const LoginSchema = z.object({
  email: z.email({pattern: EMAIL_VALIDATION_PATTERN}).min(1),
  password: z.string().min(1),
})
export type LoginSchemaInput = z.infer<typeof LoginSchema>
type LoginSchemaError = ZodError<LoginSchemaInput>
