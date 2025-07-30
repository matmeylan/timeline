import {PageProps} from '$fresh/server.ts'
import {settingsSecurity} from '../../core/route/routes.ts'
import {clsx} from '@nick/clsx'

export default function AuthLayout({Component, ...props}: PageProps) {
  const settings = props.route.includes(settingsSecurity.split('/')[1])
  return (
    <div class="flex min-h-screen justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
      <div class={clsx('w-full', {'max-w-md': !settings, 'max-w-3xl': settings})}>
        <div class={clsx('rounded-lg border border-slate-200 bg-white shadow-xl', {'p-8': !settings})}>
          <Component {...props} />
        </div>
      </div>
    </div>
  )
}
