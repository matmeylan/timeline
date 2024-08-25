import {ZodError} from '$zod'
import {Model} from '../database/model.types.ts'

export interface CreateJournal {
  title: string
  slug?: string
}

export interface Journal extends Model {
  id: string
  slug: string
  title: string
  createdAt: Date | string // ISO-8601
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

export class NotFoundError extends Error {}
