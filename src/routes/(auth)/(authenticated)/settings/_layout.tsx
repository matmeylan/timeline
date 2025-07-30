import {PageProps} from '$fresh/server.ts'
import {Link} from '../../../../components/Link.tsx'
import {settingsProfile, settingsSecurity} from '../../../../core/route/routes.ts'

interface NavigationItem {
  name: string
  href: string
  icon: any
}

const navigationItems = [
  {
    name: 'Profile',
    href: settingsProfile,
    icon: (
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    name: 'Security',
    href: settingsSecurity,
    icon: (
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
]

export default function SettingsLayout({Component, route, ...props}: PageProps) {
  return (
    <div class="flex rounded-lg bg-zinc-100">
      <DesktopNav />
      <div class="max-h-1/2 min-w-0 flex-1 overflow-y-auto rounded-lg border-l border-gray-200 bg-white p-8">
        <MobileSettingsNav />
        <Component {...props} />
      </div>
    </div>
  )
}

function DesktopNav() {
  return (
    <div class="hidden w-58 flex-shrink-0 px-4 py-8 md:block">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
        <p class="mt-1 text-sm text-gray-600">Manage your account</p>
      </div>
      <nav class="mt-4 flex flex-col gap-1">
        {navigationItems.map(item => {
          return (
            <Link
              key={item.name}
              href={item.href}
              class="group flex items-center rounded-md px-3 py-2 text-sm font-medium !text-gray-900 transition-colors hover:bg-gray-50 data-current:bg-gray-50 data-current:text-gray-900"
            >
              <span class="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
function MobileSettingsNav() {
  return (
    <nav class="mb-6 flex items-center space-x-1 text-sm md:hidden">
      <span class="text-gray-500">Settings</span>
      <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <div class="flex items-center space-x-3">
        {navigationItems.map(item => {
          return (
            <Link
              key={item.name}
              href={item.href}
              class="rounded-md px-2 py-1 font-medium !text-gray-900 transition-colors hover:bg-gray-50 hover:text-gray-900 data-current:bg-gray-50 data-current:text-gray-900"
            >
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
