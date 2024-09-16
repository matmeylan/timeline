import {Handlers, PageProps} from '$fresh/server.ts'
import {Journal, JournalEntry, NotFoundError} from '../core/domain/journal.types.ts'
import {JournalService} from '../core/domain/journal.ts'

export const handler: Handlers = {
  GET(req, ctx) {
    const slug = ctx.params.slug
    const service = new JournalService()
    try {
      const journal = service.getJournalBySlug(slug)
      const entries = service.listJournalEntries(journal.id, {createdAt: 'DESC'})

      return ctx.render({journal, entries})
    } catch (err) {
      if (err instanceof NotFoundError) {
        return ctx.renderNotFound()
      }
      throw err
    }
  },
}

export default function JournalPage(props: PageProps<JournalState>) {
  const {journal} = props.data
  const date = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })

  return (
    <main>
      <h1 className="text-4xl font-bold">{journal.title}</h1>
      <p>Since {date.format(new Date(journal.createdAt))}</p>
      <a href={'/' + journal.slug + '/write'}>Write an entry</a>
      <div className="mt-8">
        <Entries data={props.data} />
      </div>
    </main>
  )
}

function Entries(props: PageProps<JournalState>) {
  const {entries} = props.data
  if (entries.length === 0) {
    return <p>No entries yet</p>
  } else {
    const date = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
    return entries.map((entry, idx, arr) => (
      <>
        <section key={entry.id}>
          <h2>{entry.title}</h2>
          <p>{date.format(new Date(entry.createdAt))}</p>
          <div className="whitespace-pre" dangerouslySetInnerHTML={{__html: entry.content}}></div>
        </section>
        {idx === arr.length - 1 ? null : <hr className="my-2" />}
      </>
    ))
  }
}

interface JournalState {
  journal: Journal
  entries: JournalEntry[]
}
