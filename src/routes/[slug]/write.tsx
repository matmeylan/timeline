import {Handlers, PageProps} from '$fresh/server.ts'
import {JournalService} from '../../core/domain/journal.ts'
import {Journal, NotFoundError} from '../../core/domain/journal.types.ts'
import {z, ZodError} from '$zod'

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
    const title = formData.get('title')?.toString()
    const content = formData.get('content')?.toString()
    const form = {title, content}
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
    <>
      <h1 className="text-4xl font-bold">New entry</h1>
      <p>in {journal.title}</p>
      <form method="post" className="mt-4 inline-flex flex-col gap-1">
        <label>
          Title
          <input type="title" name="title" value={form?.title} required />
        </label>
        <div>{errors?.fieldErrors.title}</div>

        <label>
          Content
          <textarea cols={10} name="content" value={form?.content} required />
        </label>
        <div>{errors?.fieldErrors.content}</div>

        <button type="submit">Create</button>
      </form>
    </>
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
  title: z.string().min(2, {message: 'Please provide a title of at least 2 characters'}),
  content: z.string().min(1, {message: 'Please provide a slug of at least 1 character'}),
})
type WriteEntryInput = z.infer<typeof WriteEntrySchema>
type WriteEntryError = ZodError<WriteEntryInput>
