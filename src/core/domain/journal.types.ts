import {ZodError} from '$zod'

export interface CreateJournal {
  title: string
  slug?: string
}

export interface Journal {
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
