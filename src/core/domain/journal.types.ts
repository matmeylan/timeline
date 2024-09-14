import {ZodError} from '$zod'
import {Model} from '../database/model.types.ts'

export interface StartJournal {
  title: string
  slug?: string
}

export interface Journal extends Model {
  id: string
  slug: string
  title: string
  createdAt: Date | string // ISO-8601
}

export interface WriteJournalEntry {
  title: string
  content: string
}

export interface JournalEntry extends Model {
  id: string
  createdAt: Date | string // ISO-8601
  title: string
  content: string
  journalId: string // reference to journal table
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
