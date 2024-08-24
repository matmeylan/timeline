import {Database} from '@db/sqlite'

export class SqliteClient {
  private _db?: Database

  get db(): Database {
    if (!this._db) {
      this._db = new Database(this.path)
    }

    return this._db
  }

  constructor(readonly path: string = Deno.env.get('DATABASE_PATH')!) {}

  close() {
    this._db?.close()
  }
}

export enum SQLITE_ERROR {
  SQLITE_CONSTRAINT_UNIQUE = 2067,
}
