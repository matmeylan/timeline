import {slug as generateSlug} from '$slug'
import {openKv} from 'core/database/kv.ts'
import {CreateTimeline, SlugAlreadyUsed, Timeline} from './timeline.types.ts'

const reservedSlugs = ['create']

export function createTimeline(kv: Deno.Kv): (input: CreateTimeline) => Promise<Timeline> {
  return async (input: CreateTimeline) => {
    const slug = generateSlug(input.slug || input.title)
    if (reservedSlugs.includes(slug)) {
      throw new SlugAlreadyUsed(slug)
    }

    const timeline: Timeline = {
      id: crypto.randomUUID(),
      slug,
      title: input.title,
      createdAt: Date.now(),
    }

    const primaryKey = ['timeline', 'byDate', timeline.createdAt, timeline.slug]
    const bySlug = ['timeline', 'bySlug', timeline.slug]

    const res = await kv
      .atomic()
      .check({key: primaryKey, versionstamp: null})
      .check({key: bySlug, versionstamp: null})
      .set(primaryKey, timeline)
      .set(bySlug, timeline)
      .commit()

    if (!res.ok) {
      throw new SlugAlreadyUsed(slug)
    }
    return timeline
  }
}

export function listTimelines(kv: Deno.Kv): () => Deno.KvListIterator<Timeline> {
  return () => kv.list({prefix: ['timeline', 'byDate']}, {reverse: true})
}

export async function TimelineService() {
  const kv = await openKv()
  return {
    createTimeline: createTimeline(kv),
    listTimelines: listTimelines(kv),
  }
}
