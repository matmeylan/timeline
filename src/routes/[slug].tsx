import {Handlers, PageProps} from '$fresh/server.ts'
import {Journal, JournalEntry, NotFoundError} from '../core/domain/journal.types.ts'
import {JournalService} from '../core/domain/journal.ts'
import {Container} from '../components/Container.tsx'
import {formatDate} from '../core/date/format-date.ts'
import {Prose} from '../components/Prose.tsx'
import {JSX} from 'preact'

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
  const {journal, entries} = props.data
  return (
    <JournalLayout {...props}>
      <a href={'/' + journal.slug + '/write'}>Write an entry</a>
      <Entries journal={journal} entries={entries} />
    </JournalLayout>
  )
}

function ArrowLeftIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.25 11.25 3.75 8m0 0 3.5-3.25M3.75 8h8.5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function JournalLayout(props: PageProps<JournalState> & {children: unknown[]}) {
  const {journal} = props.data
  const createdAt = formatDate(new Date(journal.createdAt))
  return (
    <Container class="mt-16 lg:mt-32">
      <div class="xl:relative">
        <div class="mx-auto max-w-2xl">
          <a
            type="button"
            href="/journals"
            aria-label="Go back to my journals"
            class="group mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5 transition lg:absolute lg:-left-5 lg:-mt-2 lg:mb-0 xl:-top-1.5 xl:left-0 xl:mt-0 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0 dark:ring-white/10 dark:hover:border-zinc-700 dark:hover:ring-white/20"
          >
            <ArrowLeftIcon class="h-4 w-4 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:stroke-zinc-500 dark:group-hover:stroke-zinc-400" />
          </a>
          <article>
            <header class="flex flex-col">
              <h1 class="mt-6 text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
                {journal.title}
              </h1>
              <time
                dateTime={createdAt}
                class="order-first flex items-center text-base text-zinc-400 dark:text-zinc-500"
              >
                <span class="h-4 w-0.5 rounded-full bg-zinc-200 dark:bg-zinc-500" />
                <span class="ml-3">{createdAt}</span>
              </time>
            </header>
            <Prose class="mt-8">{props.children}</Prose>
          </article>
        </div>
      </div>
    </Container>
  )
}

function Entries(props: JournalState) {
  const {entries} = props
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
    return (
      <>
        {entries.map((entry, idx, arr) => (
          <>
            <section key={entry.id}>
              <h2>{entry.title}</h2>
              <p>{date.format(new Date(entry.createdAt))}</p>
              <div class="whitespace-pre" dangerouslySetInnerHTML={{__html: entry.content}}></div>
            </section>
            {idx === arr.length - 1 ? null : <hr class="my-2" />}
          </>
        ))}
      </>
    )
  }
}

interface JournalState {
  journal: Journal
  entries: JournalEntry[]
}
