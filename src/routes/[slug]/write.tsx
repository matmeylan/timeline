import {Handlers, PageProps} from '$fresh/server.ts'
import {JournalService} from '../../core/domain/journal.ts'
import {Journal, NotFoundError} from '../../core/domain/journal.types.ts'
import {z, ZodError} from '$zod'
import ContentEditor from '../../islands/content-editor/content-editor.tsx'
import {Container} from '../../components/Container.tsx'
import {ArrowLeftIcon} from '../../components/icons.tsx'

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
  async POST(req, ctx) {
    const slug = ctx.params.slug
    const formData = await req.formData()
    const content = formData.get('content')?.toString()
    const contentType = formData.get('contentType')?.toString()
    const form = {content, contentType}
    const result = WriteEntrySchema.safeParse(form)

    if (!result.success) {
      const service = new JournalService()
      const journal = service.getJournalBySlug(slug)
      return ctx.render({journal, form, error: result.error}, {status: 400})
    }

    const service = new JournalService()
    const journal = service.getJournalBySlug(slug)
    service.writeEntry(journal.id, result.data)

    const headers = new Headers()
    headers.set('location', `/${journal.slug}`)
    return new Response(null, {status: 303, headers})
  },
}

export default function WriteEntryPage(props: PageProps<WriteEntryState>) {
  const {journal, form, error} = props.data
  const errors = error?.flatten()

  return (
    <Container class="mt-16 lg:mt-32">
      <div class="xl:relative">
        <div class="mx-auto max-w-2xl">
          <a
            type="button"
            href={'/' + journal.slug}
            aria-label="Back"
            class="group mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 shadow-zinc-800/5 ring-zinc-900/5 transition lg:absolute lg:-left-5 lg:-mt-2 lg:mb-0 xl:-top-1.5 xl:left-0 xl:mt-0 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0 dark:ring-white/10 dark:hover:border-zinc-700 dark:hover:ring-white/20"
          >
            <ArrowLeftIcon class="h-4 w-4 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:stroke-zinc-500 dark:group-hover:stroke-zinc-400" />
          </a>
          <header>
            <h1 class="text-4xl font-bold">New entry in {journal.title}</h1>
          </header>
          <form method="post" class="mt-8 flex flex-1 flex-col gap-1">
            <input type="hidden" value="text/markdown" id="contentType" name="contentType" />
            <ContentEditor inputName="content" content={form?.content} />
            <div>{errors?.fieldErrors.content}</div>
            <div>{errors?.fieldErrors.contentType}</div>

            <button type="submit">Create</button>
          </form>
        </div>
      </div>
    </Container>
  )
}

interface WriteEntryState {
  journal: Journal
  form?: Form
  error?: WriteEntryError
}

interface Form {
  title?: string
  content?: string
}

const WriteEntrySchema = z.object({
  content: z.string().min(1, {message: 'Please provide a slug of at least 1 character'}),
  contentType: z.enum(['text/markdown'], {message: 'Only markdown is supported at the moment'}),
})
type WriteEntryInput = z.infer<typeof WriteEntrySchema>
type WriteEntryError = ZodError<WriteEntryInput>
