import {slug as generateSlug} from '$slug'
import {CreateJournal, SlugAlreadyUsed, Journal} from './journal.types.ts'
import {openKv} from '../database/kv.ts'

const reservedSlugs = ['create']

export function createJournal(kv: Deno.Kv): (input: CreateJournal) => Promise<Journal> {
  return async (input: CreateJournal) => {
    const slug = generateSlug(input.slug || input.title)
    if (reservedSlugs.includes(slug)) {
      throw new SlugAlreadyUsed(slug)
    }

    const journal: Journal = {
      id: crypto.randomUUID(),
      slug,
      title: input.title,
      createdAt: Date.now(),
    }

    const primaryKey = ['journal', 'byDate', journal.createdAt, journal.slug]
    const bySlug = ['journal', 'bySlug', journal.slug]

    const res = await kv
      .atomic()
      .check({key: primaryKey, versionstamp: null})
      .check({key: bySlug, versionstamp: null})
      .set(primaryKey, journal)
      .set(bySlug, journal)
      .commit()

    if (!res.ok) {
      throw new SlugAlreadyUsed(slug)
    }
    return journal
  }
}

export function listJournal(kv: Deno.Kv): () => Deno.KvListIterator<Journal> {
  return () => kv.list({prefix: ['journal', 'byDate']}, {reverse: true})
}

export async function JournalService() {
  const kv = await openKv()
  return {
    createJournal: createJournal(kv),
    listJournals: listJournal(kv),
  }
}
