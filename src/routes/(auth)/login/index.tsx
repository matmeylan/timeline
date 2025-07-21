import {Handlers, PageProps} from '$fresh/server.ts'
import {Container} from '../../../components/Container.tsx'
import {RefillingTokenBucket, Throttler} from '../../../core/auth/rate-limit.ts'
import {RouteState} from '../../../core/route/state.ts'
import {z, ZodError} from '@zod/zod'
import {EMAIL_VALIDATION_PATTERN} from '../../../core/serde/email.ts'
import {UserService} from '../../../core/domain/user.ts'
import {InvalidPasswordError, UserDoesNotExistError} from '../../../core/domain/user.types.ts'
import {setSessionTokenCookie} from '../../../core/auth/session.ts'
import LoginWithPasskeyButton from '../../../islands/auth/login-with-passkey-button.tsx'

const throttler = new Throttler<string>([0, 1, 2, 4, 8, 16, 30, 60, 180, 300])
const ipBucket = new RefillingTokenBucket<string>(20, 1)

export const handler: Handlers<LoginState, RouteState> = {
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
        headers.set('location', `/verify`)
        return new Response(null, {status: 303, headers})
      }
      // TODO
      // if (!user.registered2FA) {
      //   return redirect(302, '/2fa/setup')
      // }
      // return redirect(302, get2FARedirect(user))

      headers.set('location', `/`)
      return new Response(null, {status: 303, headers})
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
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">Login</h1>
      <form method="post" class="mt-4 inline-flex flex-col gap-1">
        <label for="form-signup.email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          autocomplete="username"
          required
          value={form?.email ?? ''}
          class="border border-teal-500"
        />
        <div>{errors?.fieldErrors.email}</div>
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          autocomplete="current-password"
          required
          value={form?.password ?? ''}
          class="border border-teal-500"
        />
        <div>{errors?.fieldErrors.password}</div>
        <button type="submit">Login</button>
        {rateLimitError && <p>{rateLimitError}</p>}
      </form>
      <div>
        <LoginWithPasskeyButton />
      </div>
      <div>
        <a href={'/forgot-password?email=' + encodeURIComponent(form?.email || '')}>Forgot password</a>
      </div>
      <div>
        <a href={'/signup?email=' + encodeURIComponent(form?.email || '')}>Sign up</a>
      </div>
    </Container>
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
