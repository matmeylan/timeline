import {SqliteClient} from '../../src/core/database/sqlite.ts'

export interface Migration {
  name: string
  up(client: SqliteClient): void
}
