import {Migration} from '../migrations.types.ts'
import {SqliteClient} from '../../../src/core/database/sqlite.ts'

export class EntryTitle1746998248 implements Migration {
  name = 'EntryTitle1746998248'
  up(client: SqliteClient) {
    client.db.exec(`
        alter table journal_entry drop column title;
    `)
  }
}
