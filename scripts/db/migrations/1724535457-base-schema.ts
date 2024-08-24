import {SqliteClient} from '../../../src/core/database/sqlite.ts'
import {Migration} from '../migrations.types.ts'

export class BaseSchema1724535457 implements Migration {
  name = 'BaseSchema1724535457'
  up(client: SqliteClient) {
    client.db.exec(`
        create table journal
        (
            id         TEXT PRIMARY KEY,
            slug       TEXT UNIQUE NOT NULL,
            title      TEXT        NOT NULL,
            created_at TEXT        NOT NULL
        );
  `)
  }
}
