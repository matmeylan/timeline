import {Handlers, PageProps} from '$fresh/server.ts'
import {z, ZodError} from '@zod/zod'
import {JournalService} from '../core/domain/journal.ts'
import {SlugAlreadyUsed} from '../core/domain/journal.types.ts'
import {Container} from '../components/Container.tsx'
import {RouteState} from '../core/route/state.ts'
import {redirect} from '../core/http/redirect.ts'

export const handler: Handlers<CreateJournalState, RouteState> = {
  async POST(req, ctx) {
    const formData = await req.formData()

    const title = formData.get('title')?.toString()
    const slug = formData.get('slug')?.toString()
    const form = {
      title,
      slug,
    }
    const result = CreateJournalSchema.safeParse(form)

    if (!result.success) {
      return ctx.render({error: result.error, form}, {status: 400})
    }

    const service = new JournalService()
    try {
      const journal = service.startJournal(result.data)
      return redirect(`/${journal.slug}`, 303)
    } catch (err) {
      if (err instanceof SlugAlreadyUsed) {
        return ctx.render(
          {
            error: err.toZod(),
            form: {
              title: form.title,
              // hydrate the slug whether it was automatic or insert by the user, the error then makes more sense
              slug: err.slug,
            },
          },
          {status: 400},
        )
      }
      throw err
    }
  },
}

export default function CreateJournal(props: PageProps<CreateJournalState>) {
  const {error, form} = props.data || {}
  const errors = error ? z.flattenError(error) : undefined
  const slugHint = "When left empty, we'll generate a slug for you"

  return (
    <Container class="mt-16 lg:mt-32">
      <h1 class="text-4xl font-bold">New journal</h1>
      <form method="post" class="mt-4 inline-flex flex-col gap-1">
        <label for="title">Title</label>
        <input type="title" name="title" value={form?.title} required class="border border-teal-500" />
        <div>{errors?.fieldErrors.title}</div>

        <label for="slug">Slug</label>
        <input type="slug" name="slug" value={form?.slug} class="border border-teal-500" />
        <div>{errors?.fieldErrors.slug ? errors?.fieldErrors.slug : slugHint}</div>
        <button type="submit">Create</button>
      </form>
    </Container>
  )
}

interface CreateJournalState {
  form?: Form
  error?: CreateJournalError
}

interface Form {
  title?: string
  slug?: string
}

const CreateJournalSchema = z.object({
  title: z.string().min(2, {message: 'Please provide a title of at least 2 characters'}),
  slug: z.string().optional(),
})
export type CreateJournalInput = z.infer<typeof CreateJournalSchema>
type CreateJournalError = ZodError<CreateJournalInput>
