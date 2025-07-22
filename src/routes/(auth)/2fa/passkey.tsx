import {FreshContext, Handlers, PageProps} from '$fresh/server.ts'
import {encodeBase64} from '@oslojs/encoding'
import {Container} from '../../../components/Container.tsx'
import {RouteState} from '../../../core/route/state.ts'
import {User2FAService} from '../../../core/domain/user-2fa.ts'
import {formatDate} from '../../../core/date/format-date.ts'
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
import {verifyWebAuthnChallenge} from '../../../core/auth/webauthn.ts'
import {TooMany2faCredentialsError, WebAuthnUserCredential} from '../../../core/domain/user-2fa.types.ts'
import {Session, User} from '../../../core/domain/user.types.ts'
import RegisterPasskeyButton from '../../../islands/auth/register-passkey-button.tsx'

export const handler: Handlers<PasskeysState, RouteState> = {
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

    const user2FAService = new User2FAService()
    const passkeys = user2FAService.getUserPasskeyCredentials(user.id)

    return ctx.render({passkeys: passkeys.map(toPasskeyState)})
  },
  async POST(req, ctx) {
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

    console.log(req.url)
    const formData = await req.formData()
    const action = formData.get('action')

    console.log('triggering action')
    if (action === 'delete') {
      return deletePasskey(formData, user, ctx)
    } else if (action === 'add') {
      return addPasskey(formData, user, session, ctx)
    } else {
      throw new Error(`Unsupported action ${action}`)
    }
  },
}

export default function SignUp(props: PageProps<PasskeysState>) {
  const {passkeys, error} = props.data || {}

  return (
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">Your passkeys</h1>
      <p class="mt-2">Passkeys are WebAuthn credentials that validate your identity using your device.</p>
      <p class="mt-4">
        {passkeys.length ? (
          passkeys.map((credential, index) => (
            <li>
              {index} - Added on{' '}
              {formatDate(new Date(credential.name), {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: 'numeric',
                minute: 'numeric',
              })}
              <form method="POST">
                <input type="hidden" name="credentialId" value={encodeBase64(credential.id)} />
                <input type="hidden" name="action" value="delete" />
                <button type="submit">Delete</button>
              </form>
            </li>
          ))
        ) : (
          <em>No passkeys added yet</em>
        )}
      </p>
      <div class="mt-6">
        <RegisterPasskeyButton />
      </div>
      {error && <div class="mt-2">{error}</div>}
    </Container>
  )
}

interface PasskeysState {
  passkeys: {name: string; id: Uint8Array}[]
  error?: string
}

function toPasskeyState(p: WebAuthnUserCredential) {
  return {id: p.id, name: p.name}
}

function deletePasskey(formData: FormData, user: User, ctx: FreshContext<RouteState, PasskeysState>) {
  const encodedCredentialId = formData.get('credentialId')
  if (!encodedCredentialId || typeof encodedCredentialId !== 'string') {
    throw new Error('Missing credential ID')
  }

  const user2FAService = new User2FAService()
  const credentialId = decodeBase64(encodedCredentialId)
  user2FAService.deletePasskeyCredential(user.id, credentialId)

  const passkeys = user2FAService.getUserPasskeyCredentials(user.id)
  return ctx.render({passkeys: passkeys.map(toPasskeyState)})
}

function addPasskey(formData: FormData, user: User, session: Session, ctx: FreshContext<RouteState, PasskeysState>) {
  const headers = new Headers()
  const encodedAttestationObject = formData.get('attestationObject')
  const encodedClientDataJSON = formData.get('clientDataJson')
  const name = new Date().toISOString() // name is the date when it was generated ?

  const user2FAService = new User2FAService()
  const passkeys = user2FAService.getUserPasskeyCredentials(user.id)

  if (
    typeof name !== 'string' ||
    typeof encodedAttestationObject !== 'string' ||
    typeof encodedClientDataJSON !== 'string'
  ) {
    const error = 'Unexpected error, please try again.'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }

  let attestationObjectBytes: Uint8Array, clientDataJSON: Uint8Array
  try {
    attestationObjectBytes = decodeBase64(encodedAttestationObject)
    clientDataJSON = decodeBase64(encodedClientDataJSON)
  } catch {
    const error = 'Invalid or missing fields, please try again.'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }

  let attestationStatement: AttestationStatement
  let authenticatorData: AuthenticatorData
  try {
    const attestationObject = parseAttestationObject(attestationObjectBytes)
    attestationStatement = attestationObject.attestationStatement
    authenticatorData = attestationObject.authenticatorData
  } catch {
    const error = 'Invalid data. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }
  if (attestationStatement.format !== AttestationStatementFormat.None) {
    const error = 'Invalid data. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }
  // TODO: Update host
  if (!authenticatorData.verifyRelyingPartyIdHash('localhost')) {
    const error = 'Invalid host. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }
  if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
    const error = 'Invalid data. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }
  if (authenticatorData.credential === null) {
    const error = 'Invalid data. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }

  let clientData: ClientData
  try {
    clientData = parseClientDataJSON(clientDataJSON)
  } catch {
    const error = 'Invalid data. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }
  if (clientData.type !== ClientDataType.Create) {
    const error = 'Invalid data. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }

  if (!verifyWebAuthnChallenge(clientData.challenge)) {
    const error = 'Invalid data. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }
  // TODO: Update origin
  if (clientData.origin !== 'http://localhost:8000') {
    const error = 'Invalid origin. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }
  if (clientData.crossOrigin !== null && clientData.crossOrigin) {
    const error = 'Invalid data. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }

  let credential: WebAuthnUserCredential
  if (authenticatorData.credential.publicKey.algorithm() === coseAlgorithmES256) {
    let cosePublicKey: COSEEC2PublicKey
    try {
      cosePublicKey = authenticatorData.credential.publicKey.ec2()
    } catch {
      const error = 'Invalid data. Please try again'
      return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
    }
    if (cosePublicKey.curve !== coseEllipticCurveP256) {
      const error = 'Invalid data. Please try again'
      return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
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
      const error = 'Invalid data. Please try again'
      return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
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
    const error = 'Unsupported algorithm. Please try again'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }

  try {
    user2FAService.createPasskeyCredential(credential)
  } catch (e) {
    if (e instanceof TooMany2faCredentialsError) {
      const error = 'Invalid data. Please try again'
      return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
    }
    throw e
  }

  if (!session.twoFactorVerified) {
    user2FAService.setSessionAs2FAVerified(session.id)
  }

  headers.set('location', `/2fa/passkey`)
  return new Response(null, {status: 303, headers})
}
