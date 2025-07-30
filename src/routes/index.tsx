import {Handlers, PageProps} from '$fresh/server.ts'
import {Container} from '../components/Container.tsx'
import {User} from '../core/domain/user/user.types.ts'
import {userHome, login, logout, signup, startJournal, settingsSecurity} from '../core/route/routes.ts'
import {RouteState} from './_middleware.ts'
import {Link} from '../components/Link.tsx'

export const handler: Handlers<HomeState, RouteState> = {
  GET(req, ctx) {
    return ctx.render({user: ctx.state.user ? ctx.state.user : undefined})
  },
}

export default function Home(props: PageProps<HomeState>) {
  const {user} = props.data
  return (
    <Container class="mt-16 lg:mt-32">
      <img
        class="my-6"
        src="/logo.svg"
        width="128"
        height="128"
        alt="the Fresh logo: a sliced lemon dripping with juice"
      />
      <h1 class="text-4xl font-bold">
        {user ? (
          <> Welcome, {user.name}</>
        ) : (
          <>
            Welcome to <span class="inline-block rotate-6">Journals</span>
          </>
        )}
      </h1>
      {user ? <UserNav user={user} /> : <AnonymousNav />}
    </Container>
  )
}

function UserNav(props: {user: User}) {
  const {username} = props.user
  return (
    <>
      <menu class="mt-4">
        <li>
          <Link href={startJournal(username)}>Start a journal</Link>
        </li>
        <li>
          <Link href={userHome(username)}>See your journals</Link>
        </li>
      </menu>
      <pre>{JSON.stringify(props, null, 2)}</pre>
      <menu class="mt-4 inline-flex flex-col gap-2">
        <li>
          <Link href={settingsSecurity}>Settings</Link>
        </li>
        <li>
          <Link href={logout}>Sign out</Link>
        </li>
      </menu>
    </>
  )
}

function AnonymousNav() {
  return (
    <>
      <menu class="mt-4">
        <li>
          <Link href={login}>Start a journal</Link>
        </li>
      </menu>
      <menu class="inline-flex flex-col">
        <li>
          <Link href={login}>Login</Link>
        </li>
        <li>
          <Link href={signup}>Register</Link>
        </li>
      </menu>
    </>
  )
}

interface HomeState {
  user?: User
}
