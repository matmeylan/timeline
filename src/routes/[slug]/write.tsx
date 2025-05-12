import {Handlers, PageProps} from '$fresh/server.ts'
import {JournalService} from '../../core/domain/journal.ts'
import {Journal, NotFoundError} from '../../core/domain/journal.types.ts'
import {z, ZodError} from '$zod'
import ContentEditor from '../../islands/content-editor/content-editor.tsx'
import {Container} from '../../components/Container.tsx'

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
      <h1 class="text-4xl font-bold">New entry in {journal.title}</h1>
      <form method="post" class="mt-4 flex flex-1 flex-col gap-1">
        <input type="hidden" value="text/markdown" id="contentType" name="contentType" />
        <ContentEditor inputName="content" content={form?.content} />
        <div>{errors?.fieldErrors.content}</div>
        <div>{errors?.fieldErrors.contentType}</div>

        <button type="submit">Create</button>
      </form>
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
