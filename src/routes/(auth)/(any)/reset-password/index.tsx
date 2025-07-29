import {Handlers, PageProps} from '$fresh/server.ts'
import z, {ZodError} from '@zod/zod'
import {Container} from '../../../../components/Container.tsx'
import {
  deletePasswordResetSessionTokenCookie,
  getPasswordResetSessionTokenCookie,
} from '../../../../core/auth/password.ts'
import {UserService} from '../../../../core/domain/user/user.ts'
import {RouteState} from '../../../../core/route/state.ts'
import {WeakPasswordError} from '../../../../core/domain/user/user.types.ts'
import {setSessionTokenCookie} from '../../../../core/auth/session.ts'
import {redirect} from '../../../../core/http/redirect.ts'
import {forgotPassword, home, resetPasswordVerifyEmail} from '../../../../core/route/routes.ts'

export const handler: Handlers<ResetPasswordState, RouteState> = {
  GET(req, ctx) {
    const resetToken = getPasswordResetSessionTokenCookie(req.headers)
    if (!resetToken) {
      return redirect(forgotPassword, 303)
    }
    const userService = new UserService()
    const {session} = userService.validatePasswordResetSessionRequest(resetToken)
    if (!session) {
      const headers = new Headers()
      deletePasswordResetSessionTokenCookie(headers)
      return redirect(forgotPassword, 303, headers)
    }
    if (!session.emailVerified) {
      return redirect(resetPasswordVerifyEmail, 303)
    }
    return ctx.render()
  },
  async POST(req, ctx) {
    const resetToken = getPasswordResetSessionTokenCookie(req.headers)
    if (!resetToken) {
      return redirect(forgotPassword, 303)
    }
    const headers = new Headers()
    const userService = new UserService()
    const {session: passwordResetSession, user} = userService.validatePasswordResetSessionRequest(resetToken)
    if (!passwordResetSession) {
      deletePasswordResetSessionTokenCookie(headers)
      return redirect(forgotPassword, 303, headers)
    }
    if (!passwordResetSession.emailVerified) {
      return redirect(resetPasswordVerifyEmail, 303, headers)
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
      return redirect(home, 303, headers)
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
