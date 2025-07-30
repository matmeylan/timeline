import {decodeBase64, encodeBase64} from '@oslojs/encoding'
import z from '@zod/zod'
import {useSignal} from '@preact/signals'
import {home, loginViaPasskey} from '../../core/route/routes.ts'
import {Button} from '../../components/Button.tsx'
import {PasskeyIcon} from '../../components/icons.tsx'

export default function LoginWithPasskeyButton() {
  const error = useSignal('')
  const clickHandler = () => {
    loginWithPasskey().then(err => {
      if (err) {
        error.value = err
      }
    })
  }

  return (
    <div>
      <Button variant="secondary" type="button" class="w-full" onClick={clickHandler}>
        <PasskeyIcon />
        Login with Passkey
      </Button>
      {error.value && (
        <div class="mt-4 rounded-md bg-red-50 p-4">
          <p class="text-sm text-red-800">{error.value}</p>
        </div>
      )}
    </div>
  )
}

async function loginWithPasskey() {
  let passkeyErrorMessage = ''
  const challenge = await createChallenge()
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge,
      userVerification: 'required',
    },
  })

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error('Failed to create public key')
  }
  if (!(credential.response instanceof AuthenticatorAssertionResponse)) {
    throw new Error('Unexpected error')
  }

  const response = await fetch(loginViaPasskey, {
    method: 'POST',
    // this example uses JSON but you can use something like CBOR to get something more compact
    body: JSON.stringify({
      credential_id: encodeBase64(new Uint8Array(credential.rawId)),
      signature: encodeBase64(new Uint8Array(credential.response.signature)),
      authenticator_data: encodeBase64(new Uint8Array(credential.response.authenticatorData)),
      client_data_json: encodeBase64(new Uint8Array(credential.response.clientDataJSON)),
    }),
  })

  if (response.ok) {
    document.location = home
    return
  } else {
    passkeyErrorMessage = await response.text()
  }

  return passkeyErrorMessage
}

async function createChallenge(): Promise<Uint8Array> {
  const response = await fetch('/api/webauthn/challenge/login', {
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
