import {Handlers, PageProps} from '$fresh/server.ts'
import {Container} from '../components/Container.tsx'
import {User} from '../core/domain/user/user.types.ts'
import {userHome, login, logout, signup, startJournal, twoFaPasskey} from '../core/route/routes.ts'
import {RouteState} from './_middleware.ts'

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
          <a href={startJournal(username)}>Start a journal</a>
        </li>
        <li>
          <a href={userHome(username)}>See your journals</a>
        </li>
      </menu>
      <pre>{JSON.stringify(props, null, 2)}</pre>
      <menu class="mt-4 inline-flex flex-col gap-2">
        <li>
          <a href={twoFaPasskey} class="underline">
            Passkeys
          </a>
        </li>
        <li>
          <a href={logout} class="underline">
            Sign out
          </a>
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
          <a href={login}>Start a journal</a>
        </li>
      </menu>
      <menu class="inline-flex flex-col">
        <li>
          <a href={login} class="underline">
            Login
          </a>
        </li>
        <li>
          <a href={signup} class="underline">
            Register
          </a>
        </li>
      </menu>
    </>
  )
}

interface HomeState {
  user?: User
}
