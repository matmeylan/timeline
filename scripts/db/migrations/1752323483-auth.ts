import {SqliteClient} from '../../../src/core/database/sqlite.ts'
import {Migration} from '../migrations.types.ts'

export class Auth1752323483 implements Migration {
  name = 'Auth1752323483'
  up(client: SqliteClient) {
    client.db.exec(`
      CREATE TABLE user (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email_verified INTEGER NOT NULL DEFAULT 0,
          recovery_code BLOB NOT NULL
      );

      CREATE INDEX email_index ON user(email);

      CREATE TABLE session (
          id TEXT NOT NULL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES user(id),
          expires_at TEXT NOT NULL,
          two_factor_verified INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE email_verification_request (
          id TEXT NOT NULL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES user(id),
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at TEXT NOT NULL
      );

      CREATE TABLE password_reset_session (
          id TEXT NOT NULL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES user(id),
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          email_verified INTEGER NOT NULL NOT NULL DEFAULT 0,
          two_factor_verified INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE totp_credential (
          id INTEGER NOT NULL PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE REFERENCES user(id),
          key BLOB NOT NULL
      );

      CREATE TABLE passkey_credential (
          id BLOB NOT NULL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES user(id),
          name TEXT NOT NULL,
          algorithm INTEGER NOT NULL,
          public_key BLOB NOT NULL
      );

      CREATE TABLE security_key_credential (
          id BLOB NOT NULL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES user(id),
          name TEXT NOT NULL,
          algorithm INTEGER NOT NULL,
          public_key BLOB NOT NULL
      );

    `)
  }
}
