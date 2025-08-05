import {Handlers, PageProps} from '$fresh/server.ts'
import {RouteState} from '../../../_middleware.ts'
import type {User} from '../../../../core/domain/user/user.types.ts'
import assert from 'node:assert'

export const handler: Handlers<ProfileState, RouteState> = {
  GET(_req, ctx) {
    const {user} = ctx.state
    assert(user, 'user not authenticated')
    return ctx.render({user})
  },
}

export default function ProfileSettingsPage(props: PageProps<ProfileState>) {
  const {user} = props.data || {}

  return (
    <section>
      <div class="border-b border-gray-200 pb-4">
        <h1 class="text-lg font-semibold text-gray-900">Profile</h1>
        <p class="mt-1 text-sm text-gray-600">Your basic account details</p>
      </div>

      {/* Profile Information Panel */}
      <div class="mt-6 flex flex-col gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">{user.name}</div>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Username</label>
          <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            @{user.username}
          </div>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
          <div class="flex items-center gap-2">
            <div class="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
              {user.email}
            </div>
            {user.emailVerified ? (
              <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                <svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                Verified
              </span>
            ) : (
              <span class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                <svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                Unverified
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

interface ProfileState {
  user: User
}
