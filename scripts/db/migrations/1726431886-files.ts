import {Migration} from '../migrations.types.ts'
import {SqliteClient} from '../../../src/core/database/sqlite.ts'

export class Files1726431886 implements Migration {
  name = 'Files1726431886'
  up(client: SqliteClient) {
    client.db.exec(`
        create table file
        (
            fileKey             TEXT PRIMARY KEY,
            fileName            TEXT NOT NULL,
            originalSizeInBytes TEXT NOT NULL,
            contentType         TEXT NOT NULL,
            createdAt           TEXT NOT NULL
        );
    `)
  }
}
