import {Migration} from '../migrations.types.ts'
import {SqliteClient} from '../../../src/core/database/sqlite.ts'

export class JournalEntry1725039061 implements Migration {
  name = 'JournalEntry1725039061'
  up(client: SqliteClient) {
    client.db.exec(`PRAGMA foreign_keys = ON;`)
    client.db.exec(`
        create table journal_entry
        (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL,
            createdAt   TEXT NOT NULL,
            content     TEXT NOT NULL,
            contentType TEXT NOT NULL,
            journalId   TEXT NOT NULL,
            FOREIGN KEY (journalId) REFERENCES journal (id)
        );
    `)
  }
}
