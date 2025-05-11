import {Handlers, PageProps} from '$fresh/server.ts'
import {type Journal, type JournalEntry, NotFoundError} from '../core/domain/journal.types.ts'
import {JournalService} from '../core/domain/journal.ts'
import {Container} from '../components/Container.tsx'
import {formatDate} from '../core/date/format-date.ts'
import {Prose} from '../components/Prose.tsx'
import {JSX} from 'preact'
import * as markdown from '@libs/markdown'

export const handler: Handlers = {
  async GET(req, ctx) {
    const slug = ctx.params.slug
    const service = new JournalService()
    try {
      const journal = service.getJournalBySlug(slug)
      const entries: JournalEntry[] = service.listJournalEntries(journal.id, {createdAt: 'DESC'})
      const renderedEntries = await renderEntries(entries) // render markdown

      return ctx.render({journal, entries: renderedEntries})
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
      <nav class="mb-6">
        <a href={'/' + journal.slug + '/write'}>Write</a>
      </nav>
      <JournalTimeline journal={journal} entries={entries} />
    </JournalLayout>
  )
}

function renderEntries(entries: JournalEntry[]): Promise<RenderedJournalEntry[]> {
  const renderer = new markdown.Renderer()
  return Promise.all(entries.map(entry => renderEntry(renderer, entry)))
}

async function renderEntry(renderer: markdown.Renderer, entry: JournalEntry): Promise<RenderedJournalEntry> {
  if (entry.contentType !== 'text/markdown') {
    throw new Error('Only markdown supported at the moment')
  }
  return {
    ...entry,
    htmlContent: await renderer.render(entry.content),
  }
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
  const createdAt = formatDate(new Date(journal.createdAt), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
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
          <section>
            <header class="flex flex-col">
              <h1 class="text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
                {journal.title}
              </h1>
              <time dateTime={createdAt} class="mt-6 text-base text-zinc-600 dark:text-zinc-400">
                Started on {createdAt}
              </time>
            </header>
            <div class="mt-8">{props.children}</div>
          </section>
        </div>
      </div>
    </Container>
  )
}

function JournalTimeline(props: JournalState) {
  const {entries} = props
  if (entries.length === 0) {
    return <p>No entries yet</p>
  } else {
    const entryDateFormat = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
    return (
      <>
        <div className="md:border-l md:border-zinc-100 md:pl-6 md:dark:border-zinc-700/40">
          <div className="flex max-w-3xl flex-col space-y-16">
            {entries.map(entry => (
              <JournalEntry key={entry.id} entry={entry} date={entryDateFormat} />
            ))}
          </div>
        </div>
      </>
    )
  }
}

function JournalEntry({entry, date}: {entry: RenderedJournalEntry; date: Intl.DateTimeFormat}) {
  return (
    <article class="md:grid md:grid-cols-4 md:items-baseline">
      <time class="text-sm text-zinc-400 dark:text-zinc-500">{date.format(new Date(entry.createdAt))}</time>
      <div class="md:col-span-3">
        <Prose dangerouslySetInnerHTML={{__html: entry.htmlContent}} />
      </div>
    </article>
  )
}

interface JournalState {
  journal: Journal
  entries: RenderedJournalEntry[]
}

type RenderedJournalEntry = JournalEntry & {htmlContent: string}
