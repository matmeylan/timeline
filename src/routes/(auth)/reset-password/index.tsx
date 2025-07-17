import {Handlers, PageProps} from '$fresh/server.ts'
import z, {ZodError} from '@zod/zod'
import {Container} from '../../../components/Container.tsx'
import {deletePasswordResetSessionTokenCookie, getPasswordResetSessionTokenCookie} from '../../../core/auth/password.ts'
import {UserService} from '../../../core/domain/user.ts'
import {RouteState} from '../../../core/route/state.ts'
import {WeakPasswordError} from '../../../core/domain/user.types.ts'
import {setSessionTokenCookie} from '../../../core/auth/session.ts'

export const handler: Handlers<ResetPasswordState, RouteState> = {
  GET(req, ctx) {
    const resetToken = getPasswordResetSessionTokenCookie(req.headers)
    if (!resetToken) {
      const headers = new Headers()
      headers.set('location', `/forgot-password`)
      return new Response(null, {status: 303, headers})
    }
    const headers = new Headers()
    const userService = new UserService()
    const {session} = userService.validatePasswordResetSessionRequest(resetToken)
    if (!session) {
      deletePasswordResetSessionTokenCookie(headers)
      headers.set('location', `/forgot-password`)
      return new Response(null, {status: 303, headers})
    }
    if (!session.emailVerified) {
      headers.set('location', `/reset-password/verify-email`)
      return new Response(null, {status: 303, headers})
    }
    return ctx.render()
  },
  async POST(req, ctx) {
    const resetToken = getPasswordResetSessionTokenCookie(req.headers)
    if (!resetToken) {
      const headers = new Headers()
      headers.set('location', `/forgot-password`)
      return new Response(null, {status: 303, headers})
    }
    const headers = new Headers()
    const userService = new UserService()
    const {session: passwordResetSession, user} = userService.validatePasswordResetSessionRequest(resetToken)
    if (!passwordResetSession) {
      deletePasswordResetSessionTokenCookie(headers)
      headers.set('location', `/forgot-password`)
      return new Response(null, {status: 303, headers})
    }
    if (!passwordResetSession.emailVerified) {
      headers.set('location', `/reset-password/verify-email`)
      return new Response(null, {status: 303, headers})
    }
    const formData = await req.formData()
    const password = formData.get('password')?.toString()
    const result = ResetPasswordSchema.safeParse({password})
    if (!result.success) {
      return ctx.render({error: result.error}, {status: 400})
    }

    try {
      const {session, sessionToken} = await userService.resetPassword(user.id, result.data.password)
      setSessionTokenCookie(headers, sessionToken, session.expiresAt)
      deletePasswordResetSessionTokenCookie(headers)
      headers.set('location', `/`)
      return new Response(null, {status: 303, headers})
    } catch (err) {
      if (err instanceof WeakPasswordError) {
        return ctx.render({error: err.toZod()}, {status: 400})
      }
      throw err
    }
  },
}

export default function ResetPasswordPage(props: PageProps<ResetPasswordState>) {
  const {error, rateLimitError} = props.data || {}
  const errors = error ? z.flattenError(error) : undefined

  return (
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">Reset your password</h1>
      <form method="post" class="mt-4 inline-flex flex-col gap-1">
        <label for="form-signup.password">New password</label>
        <input
          type="password"
          id="form-signup.password"
          name="password"
          autocomplete="new-password"
          required
          class="border border-teal-500"
        />
        <div>{errors?.fieldErrors.password}</div>
        <button type="submit">Set new password</button>
        {rateLimitError && <p>{rateLimitError}</p>}
      </form>
    </Container>
  )
}

interface ResetPasswordState {
  error?: ResetPasswordSchemaError
  rateLimitError?: string
}

const ResetPasswordSchema = z.object({
  password: z.string().min(8).max(64),
})
export type ResetPasswordSchemaInput = z.infer<typeof ResetPasswordSchema>
type ResetPasswordSchemaError = ZodError<ResetPasswordSchemaInput>
