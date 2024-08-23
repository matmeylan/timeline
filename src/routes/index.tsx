import {Handlers, PageProps} from '$fresh/server.ts'
import {JournalService} from '../core/domain/journal.ts'
import {Journal} from '../core/domain/journal.types.ts'

export const handler: Handlers = {
  async GET(req, ctx) {
    const service = await JournalService()

    const journals: Journal[] = []
    for await (const j of service.listJournals()) {
      journals.push(j.value)
    }

    return ctx.render({
      journals,
    })
  },
}

export default function Home(props: PageProps<JournalIndexState>) {
  return (
    <main class="flex flex-col items-center justify-center">
      <img
        class="my-6"
        src="/logo.svg"
        width="128"
        height="128"
        alt="the Fresh logo: a sliced lemon dripping with juice"
      />
      <h1 class="text-4xl font-bold">Welcome to your Journals</h1>
      <menu class="mt-4">
        <li>
          <a href="/CreateJournal">Create new journal</a>
        </li>
      </menu>
      <h2 class="mt-2 text-3xl font-bold">All journals</h2>
      <JournalList journals={props.data.journals} />
    </main>
  )
}

function JournalList(props: {journals: Journal[]}) {
  const {journals} = props
  if (journals.length === 0) {
    return <p className="italic">No journal yet</p>
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
