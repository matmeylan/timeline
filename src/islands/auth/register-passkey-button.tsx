import {decodeBase64, encodeBase64} from '@oslojs/encoding'
import z from '@zod/zod'

export default function RegisterPasskeyButton() {
  const handleCreatePasskey = () => {
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
    <>
      <button type="button" onClick={handleCreatePasskey}>
        Create passkey
      </button>
    </>
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
