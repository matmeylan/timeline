import {Handlers, PageProps} from '$fresh/server.ts'
import z, {ZodError} from '@zod/zod'
import {Container} from '../../../components/Container.tsx'
import {RouteState} from '../../../core/route/state.ts'
import {RefillingTokenBucket} from '../../../core/auth/rate-limit.ts'
import {EMAIL_VALIDATION_PATTERN} from '../../../core/serde/email.ts'
import {UserDoesNotExistError} from '../../../core/domain/user/user.types.ts'
import {UserService} from '../../../core/domain/user/user.ts'
import {setPasswordResetSessionTokenCookie} from '../../../core/auth/password.ts'
import {redirect} from '../../../core/http/redirect.ts'

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
      return redirect('/reset-password/verify-email', 303, headers)
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
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">Forgot your password ?</h1>
      <form method="post" class="mt-4 inline-flex flex-col gap-1">
        <label for="email">Email</label>
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
        <button type="submit">Send reset link</button>
        {rateLimitError && <p>{rateLimitError}</p>}
      </form>
      <div>
        <a href={'/login?email=' + encodeURIComponent(form?.email || '')}>Login</a>
      </div>
      <div>
        <a href={'/signup?email=' + encodeURIComponent(form?.email || '')}>Sign up</a>
      </div>
    </Container>
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
