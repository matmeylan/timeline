import {Handlers} from '$fresh/server.ts'
import z from '@zod/zod'
import {RouteState} from '../../../../core/route/state.ts'
import {decodeBase64} from '@oslojs/encoding'
import {PasskeyService} from '../../../../core/domain/user/passkey.ts'
import {setSessionTokenCookie} from '../../../../core/auth/session.ts'
import {CredentialNotFoundError, InvalidCredentialError} from '../../../../core/domain/user/passkey.types.ts'

// Stricter rate limiting can be omitted here since creating challenges are rate-limited

export const handler: Handlers<void, RouteState> = {
  async POST(req, ctx) {
    const data: unknown = await req.json()
    const res = WebAuthnChallengeLoginSchema.safeParse(data)
    if (!res.success) {
      return new Response('Invalid or missing fields', {
        status: 400,
      })
    }

    let authenticatorData: Uint8Array
    let clientDataJSON: Uint8Array
    let credentialId: Uint8Array
    let signature: Uint8Array
    try {
      authenticatorData = decodeBase64(res.data.authenticator_data)
      clientDataJSON = decodeBase64(res.data.client_data_json)
      credentialId = decodeBase64(res.data.credential_id)
      signature = decodeBase64(res.data.signature)
    } catch {
      return new Response('Invalid or missing fields', {
        status: 400,
      })
    }

    try {
      const passkeyService = new PasskeyService()
      const data = {
        authenticatorData,
        clientDataJSON,
        credentialId,
        signature,
      }
      passkeyService.parsePasskeyGetCredentialData(data)
      const {session, sessionToken} = passkeyService.validateUserCredential(data)

      const headers = new Headers()
      setSessionTokenCookie(headers, sessionToken, session.expiresAt)
      return new Response(null, {status: 204, headers})
    } catch (err) {
      if (err instanceof CredentialNotFoundError) {
        return new Response('Invalid credential', {
          status: 400,
        })
      } else if (err instanceof InvalidCredentialError) {
        return new Response('Invalid signature', {
          status: 400,
        })
      }
      throw err
    }
  },
}

const WebAuthnChallengeLoginSchema = z.object({
  credential_id: z.base64(),
  signature: z.base64(),
  authenticator_data: z.base64(),
  client_data_json: z.base64(),
})
