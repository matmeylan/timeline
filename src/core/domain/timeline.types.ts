export interface CreateTimeline {
  title: string
}

export interface Timeline {
  id: string
  slug: string
  title: string
  createdAt: number
}

export class TimelineAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Timeline with slug ${slug} already exists`)
  }
}
