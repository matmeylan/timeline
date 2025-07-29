import {Migration} from '../migrations.types.ts'
import {SqliteClient} from '../../../src/core/database/sqlite.ts'

export class PasskeyChallenge1753714943 implements Migration {
  name = 'PasskeyChallenge1753714943'

  up(client: SqliteClient) {
    client.db.exec(`
      CREATE TABLE passkey_challenge
      (
        challenge BLOB PRIMARY KEY
      );
    `)
  }
}
