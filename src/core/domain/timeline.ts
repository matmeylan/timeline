import {slug} from '$slug'
import {CreateTimeline} from 'core/domain/timeline.types.ts'
import {Timeline, TimelineAlreadyExistsError} from './timeline.types.ts'

export const createTimeline = async (kv: Deno.Kv, input: CreateTimeline): Promise<Timeline> => {
  const timeline: Timeline = {
    id: crypto.randomUUID(),
    slug: slug(input.title),
    title: input.title,
    createdAt: Date.now(),
  }
  const res = await kv.set(['timeline', timeline.createdAt, timeline.slug], timeline)
  if (!res.ok) {
    throw new TimelineAlreadyExistsError(timeline.slug)
  }
  return timeline
}

// export function TimelineService(kv: Deno.Kv) {
//   return {
//     createTimeline: createTimeline(kv)
//   }
// }
