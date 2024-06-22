import {DatabaseClient} from 'core/db/client.ts'
import {slug} from '$slug'

export class TimelineService {
  constructor(private readonly db: DatabaseClient) {}

  async create(timeline: {title: string}) {
    const res = await this.db.timeline.create({
      data: {
        title: timeline.title,
        slug: slug(timeline.title),
      },
    })
    return res
  }
}
