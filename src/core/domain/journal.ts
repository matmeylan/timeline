import {slug as generateSlug} from '$slug'
import {
  Journal,
  JournalEntry,
  NotFoundError,
  SlugAlreadyUsed,
  StartJournal,
  WriteJournalEntry,
  EditJournalEntry,
} from './journal.types.ts'
import {isUniqueConstraintError, SqliteClient} from '../database/sqlite.ts'

// reserved slugs at the same URL path level
// TODO: user prefixed journals
const reservedSlugs = ['start', 'journals', '2fa', 'login', 'reset-password', 'signout', 'signup']

export class JournalService {
  constructor(private readonly client: SqliteClient = new SqliteClient()) {}

  startJournal(input: StartJournal): Journal {
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
      `INSERT INTO journal(id, slug, title, createdAt)
       values (:id, :slug, :title, :createdAt)`,
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

  writeEntry(journalId: string, createEntry: WriteJournalEntry): JournalEntry {
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      content: createEntry.content,
      contentType: createEntry.contentType,
      journalId,
    }
    const stmt = this.client.db.prepare(
      `INSERT INTO journal_entry (id, createdAt, content, contentType, journalId)
       VALUES (:id, :createdAt, :content, :contentType, :journalId)`,
    )
    stmt.run(entry)
    return entry
  }

  editEntry(journalId: string, entryId: string, edit: EditJournalEntry): JournalEntry {
    const stmt = this.client.db.prepare(`
      UPDATE journal_entry SET content = :content, contentType = :contentType 
      WHERE id = :entryId AND journalId = :journalId
    `)
    stmt.run({journalId, entryId, content: edit.content, contentType: edit.contentType})
    return this.getJournalEntry(journalId, entryId)
  }

  listJournalEntries(journalId: string, order: {createdAt: 'DESC' | 'ASC'}): JournalEntry[] {
    const stmt = this.client.db.prepare(
      `SELECT *
       FROM journal_entry
       WHERE journalId = :journalId
       ORDER BY createdAt ${order.createdAt}`,
    )
    return stmt.all<JournalEntry>({journalId})
  }

  getJournalEntry(journalId: string, entryId: string): JournalEntry {
    const stmt = this.client.db.prepare(
      `SELECT *
       FROM journal_entry
       WHERE journalId = :journalId AND id = :entryId`,
    )
    const entry = stmt.get<JournalEntry>({journalId, entryId})
    if (!entry) throw new Error(`Entry ${entryId} not found in journal ${journalId}`)
    return entry
  }
}
