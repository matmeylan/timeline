import {FreshContext, Handlers, PageProps} from '$fresh/server.ts'
import {decodeBase64, encodeBase64} from '@oslojs/encoding'
import {Container} from '../../../../components/Container.tsx'
import {PasskeyService} from '../../../../core/domain/user/passkey.ts'
import {formatDate} from '../../../../core/date/format-date.ts'
import {
  InvalidData,
  TooMany2faCredentialsError,
  WebAuthnUserCredential,
} from '../../../../core/domain/user/passkey.types.ts'
import {User} from '../../../../core/domain/user/user.types.ts'
import RegisterPasskeyButton from '../../../../islands/auth/register-passkey-button.tsx'
import assert from 'node:assert'
import {redirect} from '../../../../core/http/redirect.ts'
import {twoFaPasskey, verifyEmail} from '../../../../core/route/routes.ts'
import {RouteState} from '../../../_middleware.ts'

export const handler: Handlers<PasskeysState, RouteState> = {
  GET(req, ctx) {
    const {user} = ctx.state
    assert(user, 'user not authenticated')

    if (!user.emailVerified) {
      return redirect(verifyEmail, 303)
    }

    const passkeyService = new PasskeyService()
    const passkeys = passkeyService.getUserPasskeyCredentials(user.id)

    return ctx.render({passkeys: passkeys.map(toPasskeyState)})
  },
  async POST(req, ctx) {
    const {user, session} = ctx.state
    assert(user, 'user not authenticated')
    assert(session, 'session not found')

    const formData = await req.formData()
    const action = formData.get('action')
    if (action === 'delete') {
      return deletePasskey(formData, user, ctx)
    } else if (action === 'add') {
      return addPasskey(formData, user, ctx)
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

  const passkeyService = new PasskeyService()
  const credentialId = decodeBase64(encodedCredentialId)
  const passkeys = passkeyService.deletePasskeyCredential(user.id, credentialId)
  return ctx.render({passkeys: passkeys.map(toPasskeyState)})
}

function addPasskey(formData: FormData, user: User, ctx: FreshContext<RouteState, PasskeysState>) {
  const encodedAttestationObject = formData.get('attestationObject')
  const encodedClientDataJSON = formData.get('clientDataJson')
  const name = new Date().toISOString() // name is the date when it was generated ?

  const passkeyService = new PasskeyService()
  const passkeys = passkeyService.getUserPasskeyCredentials(user.id)

  if (
    typeof name !== 'string' ||
    typeof encodedAttestationObject !== 'string' ||
    typeof encodedClientDataJSON !== 'string'
  ) {
    const error = 'Unexpected error, please try again.'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }

  let attestationObject: Uint8Array, clientDataJSON: Uint8Array
  try {
    attestationObject = decodeBase64(encodedAttestationObject)
    clientDataJSON = decodeBase64(encodedClientDataJSON)
  } catch {
    const error = 'Invalid or missing fields, please try again.'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
  }

  try {
    const credential = passkeyService.parsePasskeyCreateCredentialData(user.id, {attestationObject, clientDataJSON})
    passkeyService.createPasskeyCredential(credential)
  } catch (e) {
    if (e instanceof TooMany2faCredentialsError || e instanceof InvalidData) {
      const error = 'Invalid data. Please try again'
      return ctx.render({passkeys: passkeys.map(toPasskeyState), error})
    }
    throw e
  }

  return redirect(twoFaPasskey, 303)
}
