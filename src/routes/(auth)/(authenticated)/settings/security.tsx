import {FreshContext, Handlers, PageProps} from '$fresh/server.ts'
import {decodeBase64, encodeBase64} from '@oslojs/encoding'
import {PasskeyService} from '../../../../core/domain/user/passkey.ts'
import {formatDate} from '../../../../core/date/format-date.ts'
import {
  InvalidData,
  TooMany2faCredentialsError,
  WebAuthnUserCredential,
} from '../../../../core/domain/user/passkey.types.ts'
import type {User} from '../../../../core/domain/user/user.types.ts'
import RegisterPasskeyButton from '../../../../islands/auth/register-passkey-button.tsx'
import assert from 'node:assert'
import {redirect} from '../../../../core/http/redirect.ts'
import {forgotPassword, settingsSecurity, verifyEmail} from '../../../../core/route/routes.ts'
import {RouteState} from '../../../_middleware.ts'
import {Button} from '../../../../components/Button.tsx'
import {clsx} from '@nick/clsx'
import {ExternalLinkIcon, KeyIcon, PasskeyIcon} from '../../../../components/icons.tsx'

export const handler: Handlers<PasskeysState, RouteState> = {
  GET(_req, ctx) {
    const {user} = ctx.state
    assert(user, 'user not authenticated')

    if (!user.emailVerified) {
      return redirect(verifyEmail, 303)
    }

    const passkeyService = new PasskeyService()
    const passkeys = passkeyService.getUserPasskeyCredentials(user.id)

    return ctx.render({passkeys: passkeys.map(toPasskeyState), user})
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

export default function SecuritySettingsPage(props: PageProps<PasskeysState>) {
  const {user, passkeys, error} = props.data || {}
  return (
    <section class="flex flex-col gap-6">
      <div class="border-b border-gray-200 pb-4">
        <h1 class="text-lg font-semibold text-gray-900">Security</h1>
        <p class="mt-1 text-sm text-gray-600">Password and authentication methods</p>
      </div>

      {/* Security Overview */}
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Security Overview</h2>
        <p class="mt-1 text-sm text-gray-600">Current security status of your account</p>
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="rounded-lg bg-gray-50 p-4">
            <div class="flex h-full items-center">
              <div
                class={`flex h-8 w-8 items-center justify-center rounded-full ${user.emailVerified ? 'bg-green-100' : 'bg-yellow-100'}`}
              >
                <svg
                  class={`h-4 w-4 ${user.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  {user.emailVerified ? (
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  ) : (
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  )}
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-900">Email Verification</p>
                <p class={`text-sm ${user.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                  {user.emailVerified ? 'Verified' : 'Not verified'}
                </p>
              </div>
            </div>
          </div>
          <div class="rounded-lg bg-gray-50 p-4">
            <div class="flex items-center">
              <div
                class={`flex h-8 w-8 items-center justify-center rounded-full ${passkeys.length > 0 ? 'bg-green-100' : 'bg-gray-100'}`}
              >
                <PasskeyIcon class={`h-4 w-4 ${passkeys.length > 0 ? 'fill-green-600' : 'fill-gray-400'}`} />
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-900">Passkey</p>
                <p class={clsx('text-sm', {'text-green-600': passkeys.length > 0})}>
                  {passkeys.length > 0 ? `${passkeys.length} configured` : 'Not configured'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Panel */}
      <div class="border-t border-gray-200 pt-4">
        <h2 class="text-lg font-semibold text-gray-900">Password</h2>
        <p class="mt-1 text-sm text-gray-600">Manage your account password</p>
        <Button
          as="a"
          variant="outline"
          href={forgotPassword + `?email=` + encodeURIComponent(user.email)}
          class="mt-4"
        >
          Change password
          <ExternalLinkIcon />
        </Button>
      </div>

      {/* Passkeys Panel */}
      <div class="border-t border-gray-200 pt-4">
        <h2 class="text-lg font-semibold text-gray-900">Passkeys</h2>
        <p class="mt-1 text-sm text-gray-600">Identify using your device (FaceID, TouchID, ...)</p>
        {error && (
          <div class="mb-4 rounded-md bg-red-50 p-4">
            <div class="flex">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
              <div class="ml-3">
                <p class="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
        {passkeys.length > 0 ? (
          <div class="mt-4 flex flex-col gap-3">
            {passkeys.map((credential, index) => (
              <div key={index} class="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div class="flex items-center gap-2">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <KeyIcon class="h-5 w-5 fill-green-600" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Passkey #{index + 1}</p>
                    <p class="text-sm text-gray-600">
                      Added on{' '}
                      {formatDate(new Date(credential.name), {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <form method="POST" class="inline">
                  <input type="hidden" name="credentialId" value={encodeBase64(credential.id)} />
                  <input type="hidden" name="action" value="delete" />
                  <Button variant="destructive" type="submit">
                    Remove
                  </Button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div class="pt-8 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <PasskeyIcon class="h-8 w-8 fill-gray-400" />
            </div>
            <h3 class="mb-1 text-sm font-medium text-gray-900">No passkeys configured</h3>
            <p class="mb-4 text-sm text-gray-500">
              Add a passkey to improve your account security and enable login without a password
            </p>
          </div>
        )}
        <div class="mt-4">
          <RegisterPasskeyButton />
        </div>
      </div>
    </section>
  )
}

interface PasskeysState {
  user: User
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
  return ctx.render({passkeys: passkeys.map(toPasskeyState), user})
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
    return ctx.render({passkeys: passkeys.map(toPasskeyState), user, error})
  }

  let attestationObject: Uint8Array, clientDataJSON: Uint8Array
  try {
    attestationObject = decodeBase64(encodedAttestationObject)
    clientDataJSON = decodeBase64(encodedClientDataJSON)
  } catch {
    const error = 'Invalid or missing fields, please try again.'
    return ctx.render({passkeys: passkeys.map(toPasskeyState), user, error})
  }

  try {
    const credential = passkeyService.parsePasskeyCreateCredentialData(user.id, {attestationObject, clientDataJSON})
    passkeyService.createPasskeyCredential(credential)
  } catch (e) {
    if (e instanceof TooMany2faCredentialsError || e instanceof InvalidData) {
      const error = 'Invalid data. Please try again'
      return ctx.render({passkeys: passkeys.map(toPasskeyState), user, error})
    }
    throw e
  }

  return redirect(settingsSecurity, 303)
}
