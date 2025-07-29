import {useRef} from 'preact/hooks'
import {Container} from './Container.tsx'
import {clsx} from '@nick/clsx'
import {JSX} from 'preact'
import {asset} from '$fresh/runtime.ts'
import {home, userHome, login, signup, startJournal} from '../core/route/routes.ts'
import type {User} from '../core/domain/user/user.types.ts'

export function Header({user}: {user: User | undefined}) {
  const headerRef = useRef<HTMLDivElement>(null) // React.ElementRef<'div'>
  return (
    <>
      <header
        class="pointer-events-none relative z-50 flex flex-none flex-col"
        style={{
          height: 'var(--header-height)',
          marginBottom: 'var(--header-mb)',
        }}
      >
        <div
          ref={headerRef}
          class="top-0 z-10 h-16 pt-6"
          style={{
            position: 'var(--header-position)' as React.CSSProperties['position'],
          }}
        >
          <Container
            class="top-(--header-top,--spacing(6)) w-full"
            style={{
              position: 'var(--header-inner-position)' as React.CSSProperties['position'],
            }}
          >
            <div class="relative flex gap-4">
              <div class="flex flex-1">
                <AvatarContainer>
                  <Avatar />
                </AvatarContainer>
              </div>
              <div class="flex flex-1 justify-end md:justify-center">
                <DesktopNavigation class="pointer-events-auto" user={user} />
              </div>
              <div class="flex justify-end md:flex-1">
                <div class="pointer-events-auto">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </Container>
        </div>
      </header>
    </>
  )
}

function clamp(number: number, a: number, b: number) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  return Math.min(Math.max(number, min), max)
}

function AvatarContainer({...props}: JSX.IntrinsicElements['div']) {
  return (
    <div
      {...props}
      class={clsx(
        props.class,
        'h-10 w-10 rounded-full bg-white/90 p-0.5 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:ring-white/10',
      )}
    />
  )
}

function Avatar({
  large = false,
  class: classes,
  ...props
}: JSX.IntrinsicElements['a'] & {
  large?: boolean
}) {
  return (
    <a href="/" aria-label="Home" class={clsx(classes, 'pointer-events-auto')} {...props}>
      <img
        src={asset('/mathieu.avif')}
        alt="You!"
        sizes={large ? '4rem' : '2.25rem'}
        class={clsx(
          'dark:bg-zinc-800, rounded-full bg-zinc-100 object-cover object-top',
          large ? 'h-16 w-16' : 'h-9 w-9',
        )}
      />
    </a>
  )
}

function DesktopNavigation(props: JSX.IntrinsicElements['nav'] & {user: User | undefined}) {
  const user = props.user
  const start = user ? startJournal(user.username) : login
  return (
    <nav {...props}>
      <ul class="flex rounded-full bg-white/90 px-3 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10">
        <NavItem href={home}>Home</NavItem>
        <NavItem href={start}>Start</NavItem>
        {user && <NavItem href={userHome(user.username)}>Journals</NavItem>}
        {!user && <NavItem href={signup}>Sign up</NavItem>}
      </ul>
    </nav>
  )
}

function NavItem({href, children}: {href: string; children: string | JSX.Element}) {
  return (
    <li>
      <a
        href={href}
        class={clsx(
          'group relative block px-3 py-2 transition',
          'hover:text-teal-500 dark:hover:text-teal-400',
          'data-current:text-teal-500 dark:data-current:text-teal-400',
        )}
      >
        {children}
        <span
          class={clsx(
            'hidden',
            'group-data-current:inline-block',
            'absolute inset-x-1 -bottom-px h-px',
            'bg-linear-to-r from-teal-500/0 via-teal-500/40 to-teal-500/0 dark:from-teal-400/0 dark:via-teal-400/40 dark:to-teal-400/0',
          )}
        />
      </a>
    </li>
  )
}

type Theme = 'light' | 'dark'
function ThemeToggle() {
  // let resolvedTheme: Theme = 'light' // TODO: switch theme works
  // const setTheme = (theme: Theme) => {
  //   resolvedTheme = theme
  // }
  // const otherTheme: Theme = resolvedTheme === 'light' ? 'dark' : 'light'
  // const [mounted, setMounted] = useState(false)
  // useEffect(() => {
  //   setMounted(true)
  // }, [])

  const mounted = true
  const otherTheme = 'dark'
  const setTheme = (theme: string) => undefined

  return (
    <button
      type="button"
      aria-label={mounted ? `Switch to ${otherTheme} theme` : 'Toggle theme'}
      class="group rounded-full bg-white/90 px-3 py-2 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm transition dark:bg-zinc-800/90 dark:ring-white/10 dark:hover:ring-white/20"
      onClick={() => setTheme(otherTheme)}
    >
      <SunIcon class="h-6 w-6 fill-zinc-100 stroke-zinc-500 transition group-hover:fill-zinc-200 group-hover:stroke-zinc-700 dark:hidden [@media(prefers-color-scheme:dark)]:fill-teal-50 [@media(prefers-color-scheme:dark)]:stroke-teal-500 [@media(prefers-color-scheme:dark)]:group-hover:fill-teal-50 [@media(prefers-color-scheme:dark)]:group-hover:stroke-teal-600" />
      <MoonIcon class="hidden h-6 w-6 fill-zinc-700 stroke-zinc-500 transition dark:block [@media_not_(prefers-color-scheme:dark)]:fill-teal-400/10 [@media_not_(prefers-color-scheme:dark)]:stroke-teal-500 [@media(prefers-color-scheme:dark)]:group-hover:stroke-zinc-400" />
    </button>
  )
}

function SunIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 12.25A4.25 4.25 0 0 1 12.25 8v0a4.25 4.25 0 0 1 4.25 4.25v0a4.25 4.25 0 0 1-4.25 4.25v0A4.25 4.25 0 0 1 8 12.25v0Z" />
      <path
        d="M12.25 3v1.5M21.5 12.25H20M18.791 18.791l-1.06-1.06M18.791 5.709l-1.06 1.06M12.25 20v1.5M4.5 12.25H3M6.77 6.77 5.709 5.709M6.77 17.73l-1.061 1.061"
        fill="none"
      />
    </svg>
  )
}

function MoonIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M17.25 16.22a6.937 6.937 0 0 1-9.47-9.47 7.451 7.451 0 1 0 9.47 9.47ZM12.75 7C17 7 17 2.75 17 2.75S17 7 21.25 7C17 7 17 11.25 17 11.25S17 7 12.75 7Z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
