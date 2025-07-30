import {Handlers, PageProps} from '$fresh/server.ts'
import {z, ZodError} from '@zod/zod'
import {RefillingTokenBucket} from '../../../core/auth/rate-limit.ts'
import {UserService} from '../../../core/domain/user/user.ts'
import {setEmailVerificationRequestCookie} from '../../../core/auth/email-verification.ts'
import {setSessionTokenCookie} from '../../../core/auth/session.ts'
import {EMAIL_VALIDATION_PATTERN} from '../../../core/serde/email.ts'
import {
  EmailAlreadyUsedError,
  ReservedUsername,
  UsernameAlreadyUsedError,
  WeakPasswordError,
} from '../../../core/domain/user/user.types.ts'
import {redirect} from '../../../core/http/redirect.ts'
import {login, verifyEmail} from '../../../core/route/routes.ts'
import {RouteState} from '../../_middleware.ts'
import {Description, Error, FormField, Input, Label} from '../../../components/form/FormField.tsx'
import {Button} from '../../../components/Button.tsx'
import {Link} from '../../../components/Link.tsx'

const ipBucket = new RefillingTokenBucket<string>(3, 10)

export const handler: Handlers<SignupState, RouteState> = {
  GET(req, ctx) {
    const url = new URL(req.url)
    const email = decodeURIComponent(url.searchParams.get('email') || '')
    return ctx.render({form: {email}})
  },
  async POST(req, ctx) {
    const formData = await req.formData()
    const email = formData.get('email')?.toString()
    const password = formData.get('password')?.toString()
    const name = formData.get('name')?.toString()
    const username = formData.get('username')?.toString()
    const form = {
      email,
      password,
      name,
      username,
    }
    const result = SignupSchema.safeParse(form)
    if (!result.success) {
      return ctx.render({error: result.error, form}, {status: 400})
    }

    // rate limiting
    const clientIP = req.headers.get('X-Forwarded-For') // TODO: Assumes X-Forwarded-For is always included.
    if (clientIP !== null && !ipBucket.check(clientIP, 1)) {
      return ctx.render({rateLimitError: 'Too many requests'}, {status: 429})
    }
    if (clientIP !== null && !ipBucket.consume(clientIP, 1)) {
      return ctx.render({rateLimitError: 'Too many requests'}, {status: 429})
    }

    const userService = new UserService()
    try {
      const {emailVerificationRequest, session, sessionToken} = await userService.createUser(result.data)

      const headers = new Headers()
      setEmailVerificationRequestCookie(headers, emailVerificationRequest)
      setSessionTokenCookie(headers, sessionToken, session.expiresAt)
      return redirect(verifyEmail, 302, headers)
    } catch (err) {
      if (
        err instanceof EmailAlreadyUsedError ||
        err instanceof WeakPasswordError ||
        err instanceof UsernameAlreadyUsedError ||
        err instanceof ReservedUsername
      ) {
        return ctx.render({error: err.toZod(), form}, {status: 400})
      }
      throw err
    }
  },
}

export default function SignUp(props: PageProps<SignupState>) {
  const {error, form, rateLimitError} = props.data || {}
  const errors = error ? z.flattenError(error) : undefined

  return (
    <div class="space-y-6">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Start writing now</h1>
        <p class="mt-2 text-sm text-gray-600">Sign up and get started on your first journal.</p>
      </div>

      <form method="post">
        <div class="flex flex-col gap-4">
          <FormField>
            <Label for="form-signup.name">Your Name</Label>
            <Input
              type="text"
              id="form-signup.name"
              name="name"
              autocomplete="name"
              required
              value={form?.name ?? ''}
              placeholder="Enter your name"
              class="w-full"
            />
            {errors?.fieldErrors.name && <Error>{errors.fieldErrors.name}</Error>}
          </FormField>
          <FormField>
            <Label for="form-signup.email">Email</Label>
            <Input
              type="email"
              id="form-signup.email"
              name="email"
              autocomplete="username email"
              required
              value={form?.email ?? ''}
              placeholder="Enter your email"
              class="w-full"
            />
            <Description>You'll use that to sign in. Your email won't be visible anywhere.</Description>
            {errors?.fieldErrors.email && <Error>{errors.fieldErrors.email}</Error>}
          </FormField>
          <FormField>
            <Label for="form-signup.password">Password</Label>
            <Input
              type="password"
              id="form-signup.password"
              name="password"
              autocomplete="new-password"
              required
              value={form?.password ?? ''}
              placeholder="Create a strong password"
              class="w-full"
            />
            {errors?.fieldErrors.password && <Error>{errors.fieldErrors.password}</Error>}
          </FormField>
          <FormField>
            <Label for="form-signup.username">Username</Label>
            <Input
              type="text"
              id="form-signup.username"
              name="username"
              autocomplete="nickname"
              required
              value={form?.username ?? ''}
              placeholder="Choose a username"
              class="w-full"
            />
            <Description>
              Your unique handle that identifies you. Your journals will live under your handle.
            </Description>
            {errors?.fieldErrors.username && <Error>{errors.fieldErrors.username}</Error>}
          </FormField>
        </div>

        {rateLimitError && (
          <div class="mt-4 rounded-md bg-red-50 p-4">
            <p class="text-sm text-red-800">{rateLimitError}</p>
          </div>
        )}

        <Button type="submit" class="mt-4 w-full">
          Create Account
        </Button>
      </form>

      <div class="text-center">
        <p class="text-sm text-gray-600">
          Already have an account? <Link href={login + '?email=' + encodeURIComponent(form?.email || '')}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

interface SignupState {
  form?: Form
  error?: SignupSchemaError
  rateLimitError?: string
}

interface Form {
  email?: string
  name?: string
  username?: string
  password?: string
}

const SignupSchema = z.object({
  email: z.email({pattern: EMAIL_VALIDATION_PATTERN}).max(256),
  name: z.string().min(1).max(256),
  username: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]+$/, 'Please only use lowercase letters and numbers'),
  password: z.string().min(8).max(64),
})
export type SignupSchemaInput = z.infer<typeof SignupSchema>
type SignupSchemaError = ZodError<SignupSchemaInput>
