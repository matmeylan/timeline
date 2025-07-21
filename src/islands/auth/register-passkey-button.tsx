import {decodeBase64, encodeBase64} from '@oslojs/encoding'
import {WebAuthnUserCredential} from '../../core/domain/user-2fa.types.ts'
import z from '@zod/zod'

export default function RegisterPasskeyButton(props: {
  user: {email: string}
  credentials: WebAuthnUserCredential[]
  credentialUserId: Uint8Array
}) {
  const handleCreatePasskey = () => {
    generatePasskey(props).then(res => {
      // use a HTML form to use form submission by the browser, follow redirections, etc...
      const form = document.createElement('form')
      form.method = 'POST'
      form.style.display = 'none'

      Object.entries({
        attestation_object: res.encodedAttestationObject,
        client_data_json: res.encodedClientDataJSON,
      }).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      })

      document.body.appendChild(form)
      form.submit() // This triggers browser navigation
      document.body.removeChild(form)
    })
  }

  return (
    <>
      <button type="button" onClick={handleCreatePasskey}>
        Create passkey
      </button>
    </>
  )
}

async function generatePasskey(props: {
  user: {email: string}
  credentials: WebAuthnUserCredential[]
  credentialUserId: Uint8Array
}) {
  const {user, credentials, credentialUserId} = props
  const challenge = await createChallenge()
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      user: {
        displayName: user.email,
        id: credentialUserId,
        name: user.email,
      },
      rp: {
        name: 'SvelteKit WebAuthn example',
      },
      pubKeyCredParams: [
        {
          alg: -7,
          type: 'public-key',
        },
        {
          alg: -257,
          type: 'public-key',
        },
      ],
      attestation: 'none',
      authenticatorSelection: {
        userVerification: 'required',
        residentKey: 'required',
        requireResidentKey: true,
      },
      excludeCredentials: credentials.map(credential => {
        return {
          id: credential.id,
          type: 'public-key',
        }
      }),
    },
  })

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error('Failed to create public key')
  }
  if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
    throw new Error('Unexpected error')
  }

  const encodedAttestationObject = encodeBase64(new Uint8Array(credential.response.attestationObject))
  const encodedClientDataJSON = encodeBase64(new Uint8Array(credential.response.clientDataJSON))
  return {encodedAttestationObject, encodedClientDataJSON}
}

async function createChallenge(): Promise<Uint8Array> {
  const response = await fetch('/api/webauthn/challenge', {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Failed to create challenge')
  }
  const result = await response.json()
  const data = WebAuthnChallengeResponseSchema.parse(result)
  return decodeBase64(data.challenge)
}

const WebAuthnChallengeResponseSchema = z.object({
  challenge: z.string(),
})
