import {PageProps, RouteConfig} from '$fresh/server.ts'
import {Header} from '../components/Header.tsx'
import type {User} from '../core/domain/user/user.types.ts'

export const config: RouteConfig = {
  skipInheritedLayouts: true, // Skip already inherited layouts
}

export default function Layout({Component, state}: PageProps) {
  const user = state.user as User | undefined
  return (
    <>
      <div class="fixed inset-0 flex justify-center sm:px-8">
        <div class="flex w-full max-w-7xl lg:px-8">
          <div class="w-full bg-white ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-300/20" />
        </div>
      </div>
      <div class="relative flex w-full flex-col">
        <Header user={user} />
        <main class="flex-auto">
          <Component />
        </main>
        {/*<Footer />*/}
      </div>
    </>
  )
}
