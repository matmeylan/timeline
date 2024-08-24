import {slug as generateSlug} from '$slug'
import {CreateJournal, Journal, SlugAlreadyUsed} from './journal.types.ts'
import {SQLITE_ERROR, SqliteClient} from '../database/sqlite.ts'
import {SqliteError} from '@db/sqlite'

// reserved slugs at the same URL path level
const reservedSlugs = ['create']

export class JournalService {
  constructor(private readonly client: SqliteClient = new SqliteClient()) {}

  createJournal(input: CreateJournal): Journal {
    const slug = generateSlug(input.slug || input.title)
    if (reservedSlugs.includes(slug)) {
      throw new SlugAlreadyUsed(slug)
    }

    const journal: Journal = {
      id: crypto.randomUUID(),
      slug,
      title: input.title,
      createdAt: new Date(),
    }

    const stmt = this.client.db.prepare(
      `INSERT INTO journal(id, slug, title, created_at) values (:id, :slug, :title, :createdAt)`,
    )

    try {
      stmt.run(journal)
    } catch (err) {
      console.log('error', err)
      console.log('SqliteError', err instanceof SqliteError)
      if (err instanceof SqliteError && err.code === SQLITE_ERROR.SQLITE_CONSTRAINT_UNIQUE) {
        throw new SlugAlreadyUsed(slug)
      }
      throw err
    }

    return journal
  }

  listJournals(): Journal[] {
    const stmt = this.client.db.prepare(`SELECT * from journal`)
    return stmt.all<Journal>()
  }
}
