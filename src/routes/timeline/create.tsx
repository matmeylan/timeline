import {Handlers, PageProps} from '$fresh/server.ts'
import {z, ZodError} from '$zod'
import {TimelineService} from 'core/domain/timeline.service.ts'
import {database} from 'core/db/client.ts'

export const handler: Handlers = {
  async POST(req, ctx) {
    const form = await req.formData()

    const title = form.get('title')?.toString()
    const result = CreateTimelineSchema.safeParse({
      title,
    })

    if (!result.success) {
      return ctx.render({error: result.error, form: {title}}, {status: 400})
    }

    const timelineService = new TimelineService(database)
    const timeline = await timelineService.create({title: result.data.title})

    const headers = new Headers()
    headers.set('location', `/timeline/${timeline.slug}`)
    return new Response(null, {status: 303, headers})
  },
}

export default function CreateTimeline(props: PageProps<CreateTimelineState>) {
  const {error, form} = props.data || {}
  const errors = error?.flatten()
  return (
    <>
      <h1 class="text-4xl font-bold">New timeline</h1>
      <form method="post" class="mt-4 inline-flex flex-col gap-1">
        <label for="title">Title</label>
        <input type="title" name="title" value={form?.title} required />
        <div>{errors?.fieldErrors.title}</div>
        <button type="submit">Create</button>
      </form>
    </>
  )
}

interface CreateTimelineState {
  form?: Form
  error?: CreateTimelineError
}

interface Form {
  title?: string
}

const CreateTimelineSchema = z.object({
  title: z.string().min(2, {message: 'Please provide a title of at least 2 characters'}),
})
type CreateTimelineInput = z.infer<typeof CreateTimelineSchema>
type CreateTimelineError = ZodError<CreateTimelineInput>
