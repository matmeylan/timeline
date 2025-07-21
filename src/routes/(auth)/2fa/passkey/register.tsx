import {User2FAService} from '../../../../core/domain/user-2fa.ts'
import {TooMany2faCredentialsError, WebAuthnUserCredential} from '../../../../core/domain/user-2fa.types.ts'
import {RouteState} from '../../../../core/route/state.ts'
import {Handlers, PageProps} from '$fresh/server.ts'
import {Container} from '../../../../components/Container.tsx'
import {generateRandomCredentialsId, verifyWebAuthnChallenge} from '../../../../core/auth/webauthn.ts'
import RegisterPasskeyButton from '../../../../islands/auth/register-passkey-button.tsx'
import {decodeBase64} from '@oslojs/encoding'
import type {
  AttestationStatement,
  AuthenticatorData,
  ClientData,
  COSEEC2PublicKey,
  COSERSAPublicKey,
} from '@oslojs/webauthn'
import {
  parseAttestationObject,
  AttestationStatementFormat,
  parseClientDataJSON,
  coseAlgorithmES256,
  coseEllipticCurveP256,
  ClientDataType,
  coseAlgorithmRS256,
} from '@oslojs/webauthn'
import {ECDSAPublicKey, p256} from '@oslojs/crypto/ecdsa'
import {RSAPublicKey} from '@oslojs/crypto/rsa'

export const handler: Handlers<RegisterPasskeyState, RouteState> = {
  GET(req, ctx) {
    const {user, session} = ctx.state
    if (!user || !session) {
      const headers = new Headers()
      headers.set('location', `/login`)
      return new Response(null, {status: 303, headers})
    }
    if (!user.emailVerified) {
      const headers = new Headers()
      headers.set('location', `/verify`)
      return new Response(null, {status: 303, headers})
    }
    // TODO: other factor
    // if (user.registered2FA && !session.twoFactorVerified) {
    //   const headers = new Headers()
    //   headers.set('location', `/2fa/passkey/register`)
    //   return new Response(null, {status: 303, headers})
    // }

    const user2FAService = new User2FAService()
    const credentials = user2FAService.getUserPasskeyCredentials(user.id)
    const credentialUserId = generateRandomCredentialsId()
    const url = new URL(req.url)
    const error = decodeURIComponent(url.searchParams.get('error') || '') || undefined
    return ctx.render({credentials, credentialUserId, user, error})
  },
  async POST(req, ctx) {
    const headers = new Headers()
    const {user, session} = ctx.state
    if (!user || !session) {
      headers.set('location', `/login`)
      return new Response(null, {status: 303, headers})
    }
    if (!user.emailVerified) {
      headers.set('location', `/verify`)
      return new Response(null, {status: 303, headers})
    }
    // TODO: other factor
    // if (user.registered2FA && !session.twoFactorVerified) {
    //   headers.set('location', `/2fa/passkey/register`)
    //   return new Response(null, {status: 303, headers})
    // }

    const formData = await req.formData()
    const encodedAttestationObject = formData.get('attestation_object')
    const encodedClientDataJSON = formData.get('client_data_json')
    const name = new Date().toISOString() // name is the date when it was generated ?

    if (
      typeof name !== 'string' ||
      typeof encodedAttestationObject !== 'string' ||
      typeof encodedClientDataJSON !== 'string'
    ) {
      const err = 'Unexpected error, please try again.'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }

    let attestationObjectBytes: Uint8Array, clientDataJSON: Uint8Array
    try {
      attestationObjectBytes = decodeBase64(encodedAttestationObject)
      clientDataJSON = decodeBase64(encodedClientDataJSON)
    } catch {
      const err = 'Invalid or missing fields, please try again.'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }

    let attestationStatement: AttestationStatement
    let authenticatorData: AuthenticatorData
    try {
      const attestationObject = parseAttestationObject(attestationObjectBytes)
      attestationStatement = attestationObject.attestationStatement
      authenticatorData = attestationObject.authenticatorData
    } catch {
      const err = 'Invalid data. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }
    if (attestationStatement.format !== AttestationStatementFormat.None) {
      const err = 'Invalid data. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }
    // TODO: Update host
    if (!authenticatorData.verifyRelyingPartyIdHash('localhost')) {
      const err = 'Invalid host. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }
    if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
      const err = 'Invalid data. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }
    if (authenticatorData.credential === null) {
      const err = 'Invalid data. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }

    let clientData: ClientData
    try {
      clientData = parseClientDataJSON(clientDataJSON)
    } catch {
      const err = 'Invalid data. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }
    if (clientData.type !== ClientDataType.Create) {
      const err = 'Invalid data. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }

    if (!verifyWebAuthnChallenge(clientData.challenge)) {
      const err = 'Invalid data. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }
    // TODO: Update origin
    if (clientData.origin !== 'http://localhost:8000') {
      const err = 'Invalid origin. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }
    if (clientData.crossOrigin !== null && clientData.crossOrigin) {
      const err = 'Invalid data. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }

    let credential: WebAuthnUserCredential
    if (authenticatorData.credential.publicKey.algorithm() === coseAlgorithmES256) {
      let cosePublicKey: COSEEC2PublicKey
      try {
        cosePublicKey = authenticatorData.credential.publicKey.ec2()
      } catch {
        const err = 'Invalid data. Please try again'
        headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
        return new Response(null, {status: 303, headers})
      }
      if (cosePublicKey.curve !== coseEllipticCurveP256) {
        const err = 'Invalid data. Please try again'
        headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
        return new Response(null, {status: 303, headers})
      }
      const encodedPublicKey = new ECDSAPublicKey(p256, cosePublicKey.x, cosePublicKey.y).encodeSEC1Uncompressed()
      credential = {
        id: authenticatorData.credential.id,
        userId: user.id,
        algorithmId: coseAlgorithmES256,
        name,
        publicKey: encodedPublicKey,
      }
    } else if (authenticatorData.credential.publicKey.algorithm() === coseAlgorithmRS256) {
      let cosePublicKey: COSERSAPublicKey
      try {
        cosePublicKey = authenticatorData.credential.publicKey.rsa()
      } catch {
        const err = 'Invalid data. Please try again'
        headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
        return new Response(null, {status: 303, headers})
      }
      const encodedPublicKey = new RSAPublicKey(cosePublicKey.n, cosePublicKey.e).encodePKCS1()
      credential = {
        id: authenticatorData.credential.id,
        userId: user.id,
        algorithmId: coseAlgorithmRS256,
        name,
        publicKey: encodedPublicKey,
      }
    } else {
      const err = 'Unsupported algorithm. Please try again'
      headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
      return new Response(null, {status: 303, headers})
    }

    const user2FAService = new User2FAService()
    try {
      user2FAService.createPasskeyCredential(credential)
    } catch (e) {
      if (e instanceof TooMany2faCredentialsError) {
        const err = 'Invalid data. Please try again'
        headers.set('location', `/2fa/passkey/register?error=${encodeURIComponent(err)}`)
        return new Response(null, {status: 303, headers})
      }
      throw e
    }

    if (!session.twoFactorVerified) {
      user2FAService.setSessionAs2FAVerified(session.id)
    }

    headers.set('location', `/`)
    return new Response(null, {status: 303, headers})
  },
}

export default function RegisterPasskeyPage(props: PageProps<RegisterPasskeyState>) {
  const {credentialUserId, credentials, user, error} = props.data || {}

  return (
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">Add a passkey</h1>
      <div class="mt-6">
        <RegisterPasskeyButton credentialUserId={credentialUserId} credentials={credentials} user={user} />
      </div>
      {error && <div class="mt-2">{error}</div>}
    </Container>
  )
}

interface RegisterPasskeyState {
  credentials: WebAuthnUserCredential[]
  credentialUserId: Uint8Array
  user: {email: string}
  error?: string
}
