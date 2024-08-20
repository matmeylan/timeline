import {ZodError} from '$zod'

export interface CreateTimeline {
  title: string
  slug?: string
}

export interface Timeline {
  id: string
  slug: string
  title: string
  createdAt: number
}

export interface Zodable {
  toZod(): ZodError
}

export class SlugAlreadyUsed extends Error implements Zodable {
  constructor(readonly slug: string) {
    super(`Slug "${slug}" is already used`)
  }

  toZod() {
    return new ZodError([
      {
        code: 'custom',
        path: ['slug'],
        message: this.message,
      },
    ])
  }
}
