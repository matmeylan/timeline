import {PageProps, Handlers} from '$fresh/server.ts'
import {Container} from '../../components/Container.tsx'
import {z, ZodError} from '@zod/zod'
import {RefillingTokenBucket} from '../../core/auth/rate-limit.ts'
import {UserService} from '../../core/domain/user.ts'
import {setEmailVerificationRequestCookie} from '../../core/auth/email-verification.ts'
import {setSessionTokenCookie} from '../../core/auth/session.ts'
import {EMAIL_VALIDATION_PATTERN} from '../../core/serde/email.ts'
import {EmailAlreadyUsedError, UsernameAlreadyUsedError, WeakPasswordError} from '../../core/domain/user.types.ts'
import {RouteState} from '../../core/route/state.ts'

const ipBucket = new RefillingTokenBucket<string>(3, 10)

export const handler: Handlers<SignupState, RouteState> = {
  GET(req, ctx) {
    const {user} = ctx.state
    if (user) {
      const headers = new Headers()
      if (user.emailVerified) {
        headers.set('location', `/`)
      } else {
        headers.set('location', `/verify`)
      }
      return new Response(null, {status: 303, headers})
    }

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

      headers.set('location', `/verify`)
      return new Response(null, {status: 302, headers})
    } catch (err) {
      if (
        err instanceof EmailAlreadyUsedError ||
        err instanceof WeakPasswordError ||
        err instanceof UsernameAlreadyUsedError
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
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">Create an account</h1>
      <form method="post" class="mt-4 inline-flex flex-col gap-1">
        <label for="form-signup.name">Name</label>
        <input
          type="text"
          id="form-signup.name"
          name="name"
          autocomplete="name"
          required
          value={form?.name ?? ''}
          class="border border-teal-500"
        />
        <div>{errors?.fieldErrors.name}</div>
        <label for="form-signup.email">Email</label>
        <input
          type="email"
          id="form-signup.email"
          name="email"
          autocomplete="email"
          required
          value={form?.email ?? ''}
          class="border border-teal-500"
        />
        <div>{errors?.fieldErrors.email}</div>
        <label for="form-signup.password">Password</label>
        <input
          type="password"
          id="form-signup.password"
          name="password"
          autocomplete="new-password"
          required
          value={form?.password ?? ''}
          class="border border-teal-500"
        />
        <div>{errors?.fieldErrors.password}</div>
        <label for="form-signup.username">Username</label>
        <input
          type="text"
          id="form-signup.username"
          name="username"
          autocomplete="username"
          required
          value={form?.username ?? ''}
          class="border border-teal-500"
        />
        <p>Your username is your unique handle that identifies you on the platform.</p>
        {errors?.fieldErrors.username && <div>{errors?.fieldErrors.username}</div>}
        <button type="submit">Sign up</button>
        {rateLimitError && <p>{rateLimitError}</p>}
      </form>
      <div>
        <a href={'/login?email=' + encodeURIComponent(form?.email || '')}>Login</a>
      </div>
    </Container>
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
