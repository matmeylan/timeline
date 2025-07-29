import {Handlers, PageProps} from '$fresh/src/server/types.ts'
import {JournalService} from '../../core/domain/journal.ts'
import {Journal} from '../../core/domain/journal.types.ts'
import {Container} from '../../components/Container.tsx'
import {journal, startJournal} from '../../core/route/routes.ts'
import {User} from '../../core/domain/user/user.types.ts'
import {AuthenticatedRouteState} from '../../core/route/state.ts'

export const handler: Handlers<JournalIndexState, AuthenticatedRouteState> = {
  GET(req, ctx) {
    const service = new JournalService()
    const journals: Journal[] = service.listJournals()
    return ctx.render({
      journals,
      user: ctx.state.user,
    })
  },
}

export default function UserHomePage(props: PageProps<JournalIndexState>) {
  return (
    <Container class="mt-16 lg:mt-32">
      <h1 class="mt-2 text-4xl font-bold">My journals</h1>
      <MyJournals journals={props.data.journals} user={props.data.user} />
    </Container>
  )
}

function MyJournals(props: {journals: Journal[]; user: User}) {
  const {journals, user} = props
  if (journals.length === 0) {
    return (
      <>
        <p class="italic">No journal yet</p>
        <a class="mt-4" href={startJournal(props.user.username)}>
          Start a journal
        </a>
      </>
    )
  }
  return (
    <>
      <a href={startJournal(props.user.username)}>Start a journal</a>
      <ul class="mt-4">
        {journals.map(t => (
          <li>
            <a href={journal(user.username, t.slug)}>{t.title}</a>
          </li>
        ))}
      </ul>
    </>
  )
}

interface JournalIndexState {
  journals: Journal[]
  user: User
}
