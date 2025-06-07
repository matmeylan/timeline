import {Handlers, PageProps} from '$fresh/src/server/types.ts'
import {JournalService} from '../core/domain/journal.ts'
import {Journal} from '../core/domain/journal.types.ts'
import {Container} from '../components/Container.tsx'

export const handler: Handlers = {
  GET(ctx) {
    const req = ctx.req
    const service = new JournalService()
    const journals: Journal[] = service.listJournals()
    return ctx.render({
      journals,
    })
  },
}

export default function Journals(props: PageProps<JournalIndexState>) {
  return (
    <Container class="mt-16 lg:mt-32">
      <h1 class="mt-2 text-4xl font-bold">My journals</h1>
      <MyJournals journals={props.data.journals} />
    </Container>
  )
}

function MyJournals(props: {journals: Journal[]}) {
  const {journals} = props
  if (journals.length === 0) {
    return <p class="italic">No journal yet</p>
  }
  return (
    <ul>
      {journals.map(t => (
        <li>
          <a href={t.slug}>{t.title}</a>
        </li>
      ))}
    </ul>
  )
}

interface JournalIndexState {
  journals: Journal[]
}
