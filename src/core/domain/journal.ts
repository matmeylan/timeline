import {slug as generateSlug} from '$slug'
import {CreateJournal, Journal, NotFoundError, SlugAlreadyUsed} from './journal.types.ts'
import {isUniqueConstraintError, SqliteClient} from '../database/sqlite.ts'

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
      `INSERT INTO journal(id, slug, title, createdAt) values (:id, :slug, :title, :createdAt)`,
    )

    try {
      stmt.run(journal)
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new SlugAlreadyUsed(slug)
      }
      throw err
    }

    return journal
  }

  listJournals(): Journal[] {
    const stmt = this.client.db.prepare(`SELECT * FROM journal`)
    return stmt.all<Journal>()
  }

  getJournalBySlug(slug: string): Journal {
    const stmt = this.client.db.prepare(`SELECT * FROM journal where slug = :slug`)
    const journal = stmt.get<Journal>({slug})
    if (!journal) {
      throw new NotFoundError(`Journal ${slug} was not found`)
    }
    return journal
  }
}
