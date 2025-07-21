import {SqliteClient} from '../database/sqlite.ts'
import {TooMany2faCredentialsError, WebAuthnUserCredential} from './user-2fa.types.ts'

export class User2FAService {
  constructor(private readonly client: SqliteClient = new SqliteClient()) {}

  getUserPasskeyCredentials(userId: string): WebAuthnUserCredential[] {
    using stmt = this.client.db.prepare(
      'SELECT id, user_id, name, algorithm, public_key FROM passkey_credential WHERE user_id = :userId',
    )
    const rows = stmt.all<{id: Uint8Array; user_id: string; name: string; algorithm: number; public_key: Uint8Array}>({
      userId,
    })

    const credentials: WebAuthnUserCredential[] = []
    for (const row of rows) {
      const credential: WebAuthnUserCredential = {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        algorithmId: row.algorithm,
        publicKey: row.public_key,
      }
      credentials.push(credential)
    }
    return credentials
  }

  createPasskeyCredential(credential: WebAuthnUserCredential): void {
    const limit = 5
    const credentials = this.getUserPasskeyCredentials(credential.userId)
    if (credentials.length >= limit) {
      throw new TooMany2faCredentialsError(limit)
    }

    using stmt = this.client.db.prepare(
      'INSERT INTO passkey_credential (id, user_id, name, algorithm, public_key) VALUES (:id, :userId, :name, :algorithm, :publicKey)',
    )
    stmt.run({
      id: credential.id,
      userId: credential.userId,
      name: credential.name,
      algorithm: credential.algorithmId,
      publicKey: credential.publicKey,
    })
  }

  setSessionAs2FAVerified(sessionId: string): void {
    this.client.db.sql`UPDATE session SET two_factor_verified = 1 WHERE id = ${sessionId}`
  }
}
