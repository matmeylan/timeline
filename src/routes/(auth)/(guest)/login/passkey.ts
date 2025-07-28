import {Handlers} from '$fresh/server.ts'
import z from '@zod/zod'
import {RouteState} from '../../../../core/route/state.ts'
import {decodeBase64} from '@oslojs/encoding'
import type {ClientData, AuthenticatorData} from '@oslojs/webauthn'
import {parseClientDataJSON, ClientDataType, parseAuthenticatorData} from '@oslojs/webauthn'
import {verifyWebAuthnChallenge} from '../../../../core/auth/webauthn.ts'
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

    let authenticatorDataBytes: Uint8Array
    let clientDataJSON: Uint8Array
    let credentialId: Uint8Array
    let signatureBytes: Uint8Array
    try {
      authenticatorDataBytes = decodeBase64(res.data.authenticator_data)
      clientDataJSON = decodeBase64(res.data.client_data_json)
      credentialId = decodeBase64(res.data.credential_id)
      signatureBytes = decodeBase64(res.data.signature)
    } catch {
      return new Response('Invalid or missing fields', {
        status: 400,
      })
    }

    let authenticatorData: AuthenticatorData
    try {
      authenticatorData = parseAuthenticatorData(authenticatorDataBytes)
    } catch {
      return new Response('Invalid data', {
        status: 400,
      })
    }
    // TODO: Update host
    if (!authenticatorData.verifyRelyingPartyIdHash('localhost')) {
      return new Response('Invalid data', {
        status: 400,
      })
    }
    if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
      return new Response('Invalid data', {
        status: 400,
      })
    }

    let clientData: ClientData
    try {
      clientData = parseClientDataJSON(clientDataJSON)
    } catch {
      return new Response('Invalid data', {
        status: 400,
      })
    }
    if (clientData.type !== ClientDataType.Get) {
      return new Response('Invalid data', {
        status: 400,
      })
    }

    if (!verifyWebAuthnChallenge(clientData.challenge)) {
      return new Response('Invalid data', {
        status: 400,
      })
    }
    // TODO: Update origin
    if (clientData.origin !== 'http://localhost:8000') {
      return new Response('Invalid data', {
        status: 400,
      })
    }
    if (clientData.crossOrigin !== null && clientData.crossOrigin) {
      return new Response('Invalid data', {
        status: 400,
      })
    }

    const passkeyService = new PasskeyService()
    try {
      const {session, sessionToken} = passkeyService.validateUserCredential({
        authenticatorDataBytes,
        clientDataJSON,
        credentialId,
        signatureBytes,
      })

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
