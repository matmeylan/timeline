import {Handlers, PageProps} from '$fresh/server.ts'
import {Container} from '../components/Container.tsx'
import {User} from '../core/domain/user.types.ts'
import {RouteState} from '../core/route/state.ts'

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
          <> Welcome, {user.email}</>
        ) : (
          <>
            Welcome to <span class="inline-block rotate-6">Journals</span>
          </>
        )}
      </h1>
      <menu class="mt-4">
        <li>
          <a href="/start">Start a journal</a>
        </li>
        <li>
          <a href="/journals">See your journals</a>
        </li>
      </menu>
      {user ? <UserNav user={user} /> : <AnonymousNav />}
    </Container>
  )
}

function UserNav(props: {user: User}) {
  return (
    <>
      <pre>{JSON.stringify(props, null, 2)}</pre>
      <div class="mt-4 flex flex-col gap-2">
        <a href="/2fa/passkey/register" class="underline">
          Passkeys
        </a>
        <a href="/signout" class="underline">
          Sign out
        </a>
      </div>
    </>
  )
}

function AnonymousNav() {
  return (
    <div class="flex flex-row gap-2">
      <a href="/login" class="underline">
        Login
      </a>
      <a href="/signup" class="underline">
        Register
      </a>
    </div>
  )
}

interface HomeState {
  user?: User
}
