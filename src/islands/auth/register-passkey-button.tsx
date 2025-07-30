import {decodeBase64, encodeBase64} from '@oslojs/encoding'
import z from '@zod/zod'
import {Button} from '../../components/Button.tsx'

export default function RegisterPasskeyButton() {
  const handleCreatePasskey = (): void => {
    generatePasskey().then(res => {
      // we use a HTML form to use form submission by the browser, follow redirections, etc...
      const form = document.createElement('form')
      form.method = 'POST'
      form.style.display = 'none'

      const actionInput = document.createElement('input')
      actionInput.type = 'hidden'
      actionInput.name = 'action'
      actionInput.value = 'add'
      form.appendChild(actionInput)

      Object.entries({
        attestationObject: res.encodedAttestationObject,
        clientDataJson: res.encodedClientDataJSON,
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
    <Button onClick={handleCreatePasskey} variant="outline" class="w-full">
      <AddPasskeyIcon />
      Add new passkey
    </Button>
  )
}

async function generatePasskey() {
  const {challenge, credentialIds, credentialUserId, user} = await createChallenge()
  const credential = await navigator.credentials.create({
    publicKey: {
      attestation: 'none',
      challenge,
      user: {
        displayName: user.email,
        id: credentialUserId,
        name: user.email,
      },
      rp: {
        name: 'Journal application',
      },
      pubKeyCredParams: [
        {
          alg: -7, // ES256
          type: 'public-key',
        },
        {
          alg: -257, // RS256
          type: 'public-key',
        },
      ],
      authenticatorSelection: {
        userVerification: 'required',
        residentKey: 'required',
        requireResidentKey: true,
      },
      excludeCredentials: credentialIds.map(id => {
        return {
          id: id,
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

async function createChallenge() {
  const response = await fetch('/api/webauthn/challenge/register', {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Failed to create challenge')
  }
  const result = await response.json()
  const data = WebAuthnChallengeResponseSchema.parse(result)
  return {
    challenge: decodeBase64(data.challenge),
    user: data.user,
    credentialUserId: decodeBase64(data.credentialUserId),
    credentialIds: data.credentialIds.map(c => decodeBase64(c)),
  }
}

const WebAuthnChallengeResponseSchema = z.object({
  challenge: z.base64(),
  user: z.object({email: z.string()}),
  credentialUserId: z.base64(),
  credentialIds: z.array(z.base64()),
})

function AddPasskeyIcon() {
  // <!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
      <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z" />
    </svg>
  )
}
