import {Handlers, PageProps} from '$fresh/server.ts'
import {z, ZodError} from '@zod/zod'
import {Button} from '../../../../components/Button.tsx'
import {Container} from '../../../../components/Container.tsx'
import {ArrowLeftIcon} from '../../../../components/icons.tsx'
import {JournalService} from '../../../../core/domain/journal.ts'
import {Journal} from '../../../../core/domain/journal.types.ts'
import ContentEditor from '../../../../islands/content-editor/content-editor.tsx'
import {redirect} from '../../../../core/http/redirect.ts'
import {User} from '../../../../core/domain/user/user.types.ts'
import {journal as journalRoute} from '../../../../core/route/routes.ts'
import {JournalRouteState} from '../_middleware.ts'

export const handler: Handlers<EditEntryState, JournalRouteState> = {
  GET(req, ctx) {
    const user = ctx.state.user
    const entryId = ctx.params.entry
    const journal = ctx.state.journal
    const service = new JournalService()
    const entry = service.getJournalEntry(journal.id, entryId)
    const form: Form = {content: entry.content, contentType: entry.contentType}
    return ctx.render({journal, form, user})
  },
  async POST(req, ctx) {
    const user = ctx.state.user
    const entryId = ctx.params.entry
    const formData = await req.formData()
    const content = formData.get('content')?.toString()
    const contentType = formData.get('contentType')?.toString()
    const form: Form = {content, contentType}
    const result = EditEntrySchema.safeParse(form) // TODO: sanitize markdown
    const journal = ctx.state.journal
    const service = new JournalService()

    if (!result.success) {
      return ctx.render({user, journal, form, error: result.error}, {status: 400})
    }

    service.editEntry(journal.id, entryId, result.data)

    return redirect(journalRoute(user.username, journal.slug) + `#${entryId}`, 303)
  },
}

export default function EditEntryPage(props: PageProps<EditEntryState>) {
  const {user, journal, form, error} = props.data
  const errors = error?.flatten()

  return (
    <Container class="mt-16 lg:mt-32">
      <div class="xl:relative">
        <div class="mx-auto max-w-2xl">
          <a
            type="button"
            href={journalRoute(user.username, journal.slug)}
            aria-label="Back"
            class="group mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 shadow-zinc-800/5 ring-zinc-900/5 transition lg:absolute lg:-left-5 lg:-mt-2 lg:mb-0 xl:-top-1.5 xl:left-0 xl:mt-0 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0 dark:ring-white/10 dark:hover:border-zinc-700 dark:hover:ring-white/20"
          >
            <ArrowLeftIcon class="h-4 w-4 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:stroke-zinc-500 dark:group-hover:stroke-zinc-400" />
          </a>
          <header>
            <h1 class="text-4xl font-bold">Edit entry in {journal.title}</h1>
          </header>
          <form method="post" class="mt-8 flex flex-1 flex-col gap-1">
            <input type="hidden" value="text/markdown" id="contentType" name="contentType" />
            <ContentEditor inputName="content" content={form?.content} />
            <div class="text-red-500">{errors?.fieldErrors.content}</div>
            <div class="text-red-500">{errors?.fieldErrors.contentType}</div>
            <div class="flex flex-row items-center justify-center">
              <Button.Hero type="submit" aria-label="Edit">
                Edit
              </Button.Hero>
            </div>
          </form>
        </div>
      </div>
    </Container>
  )
}

interface EditEntryState {
  user: User
  journal: Journal
  form: Form
  error?: EditEntryError
}

interface Form {
  content?: string
  contentType?: string
}

const EditEntrySchema = z.object({
  content: z.string().min(1, {message: 'Content should not be empty'}),
  contentType: z.enum(['text/markdown'], {message: 'Only markdown is supported at the moment'}),
})
type EditEntryInput = z.infer<typeof EditEntrySchema>
type EditEntryError = ZodError<EditEntryInput>
