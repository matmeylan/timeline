import {Handlers, PageProps} from '$fresh/server.ts'
import z, {ZodError} from '@zod/zod'
import {
  deletePasswordResetSessionTokenCookie,
  getPasswordResetSessionTokenCookie,
} from '../../../../core/auth/password.ts'
import {UserService} from '../../../../core/domain/user/user.ts'
import {WeakPasswordError} from '../../../../core/domain/user/user.types.ts'
import {setSessionTokenCookie} from '../../../../core/auth/session.ts'
import {redirect} from '../../../../core/http/redirect.ts'
import {forgotPassword, home, resetPasswordVerifyEmail} from '../../../../core/route/routes.ts'
import {RouteState} from '../../../_middleware.ts'
import {Button} from '../../../../components/Button.tsx'
import {Error, FormField, Input, Label} from '../../../../components/form/FormField.tsx'
import {KeyIcon} from '../../../../components/icons.tsx'

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
    <div class="space-y-6">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          <KeyIcon class="h-8 w-8 fill-teal-600" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900">Set new password</h1>
        <p class="mt-2 text-sm text-gray-600">Choose a strong password for your account</p>
      </div>

      <form method="post">
        <FormField>
          <Label for="password">New Password</Label>
          <Input
            type="password"
            id="password"
            name="password"
            autocomplete="new-password"
            required
            class="w-full"
            placeholder="Enter your new password"
          />
          {errors?.fieldErrors.password && <Error>{errors.fieldErrors.password}</Error>}
        </FormField>

        {rateLimitError && (
          <div class="mt-4 rounded-md bg-red-50 p-4">
            <p class="text-sm text-red-800">{rateLimitError}</p>
          </div>
        )}

        <Button type="submit" class="mt-4 w-full">
          Set New Password
        </Button>
      </form>
    </div>
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
