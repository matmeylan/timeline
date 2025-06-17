import {slug as generateSlug} from '$slug'
import {
  Journal,
  JournalEntry,
  NotFoundError,
  SlugAlreadyUsed,
  StartJournal,
  WriteJournalEntry,
} from './journal.types.ts'
import {getClient} from '../database/sqlite2.ts'

// reserved slugs at the same URL path level
const reservedSlugs = ['start', 'journals']

export class JournalService {
  constructor(private readonly client = getClient()) {}

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

    this.client.journal.create({
      data: journal,
    })

    // TODO: handle unique error
    // try {
    //   stmt.run(journal)
    // } catch (err) {
    //   if (isUniqueConstraintError(err)) {
    //     throw new SlugAlreadyUsed(slug)
    //   }
    //   throw err
    // }

    return journal
  }

  listJournals(): Promise<Journal[]> {
    return this.client.journal.findMany()
  }

  async getJournalBySlug(slug: string): Promise<Journal> {
    const journal = await this.client.journal.findFirst({
      where: {
        slug,
      },
    })
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
    // const stmt = this.client.db.prepare(
    //   `INSERT INTO journal_entry (id, createdAt, content, contentType, journalId)
    //    VALUES (:id, :createdAt, :content, :contentType, :journalId)`,
    // )
    // stmt.run(entry)
    return entry
  }

  listJournalEntries(journalId: string, order: {createdAt: 'DESC' | 'ASC'}): JournalEntry[] {
    // const stmt = this.client.db.prepare(
    //   `SELECT *
    //    FROM journal_entry
    //    WHERE journalId = :journalId
    //    ORDER BY createdAt ${order.createdAt}`,
    // )
    // return stmt.all<JournalEntry>({journalId})
    return []
  }
}
