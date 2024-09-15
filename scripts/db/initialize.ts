import {SqliteClient} from '../../src/core/database/sqlite.ts'
import * as definedMigrations from './migrations/migrations.ts'
import {Migration} from './migrations.types.ts'
import '@std/dotenv/load'
import * as log from '@std/log'

function seed(client: SqliteClient) {}

function migrate(client: SqliteClient) {
  const migrations: Migration[] = Object.values(definedMigrations)
    // instantiate, must be a class at the moment
    .map(t => new t())
    // make sure migrations are run in the correct order
    .sort((a, b) => a.name.localeCompare(b.name))

  const runTransaction = client.db.transaction(() => {
    createMigrationTableIfNotExists(client)
    for (const migration of migrations) {
      if (!migrationAlreadyRun(client, migration)) {
        migration.up(client)
        migrationWasRun(client, migration)
        log.info(`Migration ${migration.name} successfully run`)
      } else {
        log.debug(`Migration ${migration.name} skipped`)
      }
    }
  })

  return runTransaction()
}

function createMigrationTableIfNotExists(client: SqliteClient) {
  const migration = new CreateMigrationTable()
  migration.up(client)
}

export class CreateMigrationTable implements Migration {
  name = 'MigrationTable'
  up(client: SqliteClient) {
    client.db.exec(`
        create table if not exists migration
        (
            name        TEXT PRIMARY KEY,
            executed_at TEXT NOT NULL
        );
    `)
  }
}

function migrationAlreadyRun(client: SqliteClient, migration: Migration) {
  const stmt = client.db.prepare(`SELECT * from migration where name = :name`)
  const res = stmt.value({name: migration.name})
  return res && res.length > 0
}

function migrationWasRun(client: SqliteClient, migration: Migration) {
  return client.db.exec(`INSERT INTO migration(name, executed_at) values (:name, :date)`, {
    name: migration.name,
    date: new Date(),
  })
}

function main() {
  const client = new SqliteClient()
  log.info(`Initializing db at path: ${client.path}`)

  const [version] = client.db.prepare('select sqlite_version()').value<[string]>()!
  log.debug(`Version read: ${version}`)

  migrate(client)
  seed(client)

  client.close()
}

main()
