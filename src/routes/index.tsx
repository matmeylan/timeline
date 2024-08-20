import {Handlers, PageProps} from '$fresh/server.ts'
import {TimelineService} from 'core/domain/timeline.ts'
import {Timeline} from 'core/domain/timeline.types.ts'

export const handler: Handlers = {
  async GET(req, ctx) {
    const timelineService = await TimelineService()

    const timelines: Timeline[] = []
    for await (const timeline of timelineService.listTimelines()) {
      timelines.push(timeline.value)
    }

    return ctx.render({
      timelines,
    })
  },
}

export default function Home(props: PageProps<TimelineIndexState>) {
  return (
    <main class="flex flex-col items-center justify-center">
      <img
        class="my-6"
        src="/logo.svg"
        width="128"
        height="128"
        alt="the Fresh logo: a sliced lemon dripping with juice"
      />
      <h1 class="text-4xl font-bold">Welcome to your Timelines</h1>
      <menu class="mt-4">
        <li>
          <a href="/create">Create new timeline</a>
        </li>
      </menu>
      <h2 class="mt-2 text-3xl font-bold">All timelines</h2>
      <TimelineList timelines={props.data.timelines} />
    </main>
  )
}

function TimelineList(props: {timelines: Timeline[]}) {
  const {timelines} = props
  if (timelines.length === 0) {
    return <p className="italic">No timelines yet</p>
  }
  return (
    <ul>
      {timelines.map(t => (
        <li>
          <a href={t.slug}>{t.title}</a>
        </li>
      ))}
    </ul>
  )
}

interface TimelineIndexState {
  timelines: Timeline[]
}
