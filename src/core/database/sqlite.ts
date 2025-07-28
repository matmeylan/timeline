import {Database} from '@db/sqlite'

export class SqliteClient {
  private _db?: Database

  get db(): Database {
    if (!this._db) {
      this._db = new Database(this.path)
    }

    return this._db
  }

  constructor(readonly path: string = Deno.env.get('DATABASE_PATH')!) {
    if (!this.path) {
      throw new Error('No path specified for DB')
    }
  }

  close() {
    this._db?.close()
  }
}

// Not great, but it looks like it's hard to do better as it's unwrapped by sqlite3 ...
export function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('UNIQUE constraint failed')
}

export function isUniqueConstraintErrorForField(err: unknown, table: string, field: string): boolean {
  return isUniqueConstraintError(err) && err instanceof Error && err.message.includes(`${table}.${field}`)
}
