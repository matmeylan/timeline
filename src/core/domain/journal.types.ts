import {ZodError} from '@zod/zod'
import {Model} from '../database/model.types.ts'
import {Zodable} from '../serde/zod.ts'
import {CreateJournalInput} from '../../routes/start.tsx'

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
  content: string
  contentType: string
}

export interface JournalEntry extends Model {
  id: string
  createdAt: Date | string // ISO-8601
  content: string
  contentType: string
  journalId: string // reference to journal table
}

export interface EditJournalEntry {
  content: string
  contentType: string
}

export class SlugAlreadyUsed extends Error implements Zodable<CreateJournalInput> {
  constructor(readonly slug: string) {
    super(`Slug "${slug}" is already used`)
  }

  toZod() {
    return new ZodError([
      {input: this.slug, code: 'custom', path: ['slug'], message: this.message},
    ]) as ZodError<CreateJournalInput>
  }
}

export class NotFoundError extends Error {}
