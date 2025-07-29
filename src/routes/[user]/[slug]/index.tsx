import {Handlers, PageProps} from '$fresh/server.ts'
import {type Journal, type JournalEntry} from '../../../core/domain/journal.types.ts'
import {JournalService} from '../../../core/domain/journal.ts'
import {Container} from '../../../components/Container.tsx'
import {formatDate} from '../../../core/date/format-date.ts'
import {Prose} from '../../../components/Prose.tsx'
import type {ComponentChildren} from 'preact'
import * as markdown from '@libs/markdown'
import {ArrowLeftIcon, WriteIcon} from '../../../components/icons.tsx'
import {Button} from '../../../components/Button.tsx'
import {User} from '../../../core/domain/user/user.types.ts'
import {editJournalEntry, userHome, writeJournalEntry} from '../../../core/route/routes.ts'
import {JournalRouteState} from './_middleware.ts'

export const handler: Handlers<JournalState, JournalRouteState> = {
  async GET(req, ctx) {
    const service = new JournalService()
    const journal = ctx.state.journal
    const entries: JournalEntry[] = service.listJournalEntries(journal.id, {createdAt: 'DESC'})
    const renderedEntries = await renderEntries(entries) // render markdown

    return ctx.render({journal, entries: renderedEntries, user: ctx.state.user})
  },
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

export default function JournalPage(props: PageProps<JournalState>) {
  const {journal, entries, user} = props.data
  return (
    <JournalLayout {...props}>
      <JournalTimeline journal={journal} entries={entries} user={user} />
    </JournalLayout>
  )
}

function JournalLayout(props: PageProps<JournalState> & {children: ComponentChildren}) {
  const {journal, user} = props.data
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
            href={userHome(props.data.user.username)}
            aria-label="Go back to my journals"
            class="group mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 shadow-zinc-800/5 ring-zinc-900/5 transition lg:absolute lg:-left-5 lg:-mt-2 lg:mb-0 xl:-top-1.5 xl:left-0 xl:mt-0 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0 dark:ring-white/10 dark:hover:border-zinc-700 dark:hover:ring-white/20"
          >
            <ArrowLeftIcon class="h-4 w-4 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:stroke-zinc-500 dark:group-hover:stroke-zinc-400" />
          </a>
          <section>
            <header class="grid gap-2 sm:grid-cols-6">
              <h1 class="col-span-5 text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
                {journal.title}
              </h1>
              <time dateTime={createdAt} class="col-span-5 row-start-2 text-base text-zinc-600 dark:text-zinc-400">
                Started on {createdAt}
              </time>
              <div class="col-span-1 row-span-2 self-center">
                <Button.Primary
                  as="a"
                  href={writeJournalEntry(user.username, journal.slug)}
                  aria-label="Write"
                  icon={<WriteIcon />}
                >
                  Write
                </Button.Primary>
              </div>
            </header>
          </section>
          <section class="mt-8">{props.children}</section>
        </div>
      </div>
    </Container>
  )
}

function JournalTimeline(props: JournalState) {
  const {entries, journal, user} = props
  if (entries.length === 0) {
    return (
      <>
        <em class="block">Your entries will appear here!</em>
        <a class="mt-2" href={writeJournalEntry(user.username, journal.slug)}>
          Write your first entry
        </a>
      </>
    )
  } else {
    const entryDateFormat = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
    return (
      <>
        <div class="flex max-w-3xl flex-col space-y-16">
          {entries.map(entry => (
            <JournalEntry key={entry.id} entry={entry} date={entryDateFormat} journal={journal} user={user} />
          ))}
        </div>
      </>
    )
  }
}

function JournalEntry({
  entry,
  date,
  journal,
  user,
}: {
  entry: RenderedJournalEntry
  date: Intl.DateTimeFormat
  journal: Journal
  user: User
}) {
  return (
    <article class="group md:grid md:grid-cols-4 md:items-start" id={entry.id}>
      <div class="flex flex-col gap-4">
        <time class="text-sm text-zinc-400 dark:text-zinc-500">{date.format(new Date(entry.createdAt))}</time>
        <Button.Secondary as="a" href={editJournalEntry(user.username, journal.slug, entry.id)}>
          Edit
        </Button.Secondary>
      </div>
      <div class="md:col-span-3">
        <Prose dangerouslySetInnerHTML={{__html: entry.htmlContent}} />
      </div>
    </article>
  )
}

interface JournalState {
  journal: Journal
  entries: RenderedJournalEntry[]
  user: User
}

type RenderedJournalEntry = JournalEntry & {htmlContent: string}
