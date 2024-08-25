import {Handlers, PageProps} from '$fresh/server.ts'
import {Journal, NotFoundError} from '../core/domain/journal.types.ts'
import {JournalService} from '../core/domain/journal.ts'

export const handler: Handlers = {
  GET(req, ctx) {
    const slug = ctx.params.slug
    const service = new JournalService()
    try {
      const journal = service.getJournalBySlug(slug)
      return ctx.render({journal})
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
    <>
      <h1 class="text-4xl font-bold">{journal.title}</h1>
      <p>Since {date.format(new Date(journal.createdAt))}</p>
      <a href={'/' + journal.slug + '/write'}>Write an entry</a>
    </>
  )
}

interface JournalState {
  journal: Journal
}
