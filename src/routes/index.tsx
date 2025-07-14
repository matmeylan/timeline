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
      <pre> {JSON.stringify(user, null, 2)} </pre>
    </Container>
  )
}

interface HomeState {
  user?: User
}
