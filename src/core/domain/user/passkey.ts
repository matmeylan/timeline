import {SqliteClient} from '../../database/sqlite.ts'
import {
  CredentialNotFoundError,
  InvalidCredentialError,
  TooMany2faCredentialsError,
  WebAuthnUserCredential,
} from './passkey.types.ts'
import {decodePKIXECDSASignature, decodeSEC1PublicKey, p256, verifyECDSASignature} from '@oslojs/crypto/ecdsa'
import {decodePKCS1RSAPublicKey, sha256ObjectIdentifier, verifyRSASSAPKCS1v15Signature} from '@oslojs/crypto/rsa'
import {sha256} from '@oslojs/crypto/sha2'
import {coseAlgorithmES256, coseAlgorithmRS256, createAssertionSignatureMessage} from '@oslojs/webauthn'
import {SessionService} from './session.ts'

export class PasskeyService {
  constructor(
    private readonly client: SqliteClient = new SqliteClient(),
    private readonly sessionService: SessionService = new SessionService(client),
  ) {}

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

  getPasskeyCredential(credentialId: Uint8Array): WebAuthnUserCredential {
    using stmt = this.client.db.prepare(
      'SELECT id, user_id, name, algorithm, public_key FROM passkey_credential WHERE id = :credentialId',
    )
    const credential = stmt.get<{
      id: Uint8Array
      user_id: string
      name: string
      algorithm: number
      public_key: Uint8Array
    }>({
      credentialId,
    })

    if (!credential) {
      throw new CredentialNotFoundError(credentialId)
    }

    return {
      id: credential.id,
      algorithmId: credential.algorithm,
      name: credential.name,
      publicKey: credential.public_key,
      userId: credential.user_id,
    }
  }

  validateUserCredential(input: {
    authenticatorDataBytes: Uint8Array
    clientDataJSON: Uint8Array
    credentialId: Uint8Array
    signatureBytes: Uint8Array
  }) {
    const {authenticatorDataBytes, credentialId, clientDataJSON, signatureBytes} = input
    const credential = this.getPasskeyCredential(credentialId)

    let validSignature: boolean
    if (credential.algorithmId === coseAlgorithmES256) {
      const ecdsaSignature = decodePKIXECDSASignature(signatureBytes)
      const ecdsaPublicKey = decodeSEC1PublicKey(p256, credential.publicKey)
      const hash = sha256(createAssertionSignatureMessage(authenticatorDataBytes, clientDataJSON))
      validSignature = verifyECDSASignature(ecdsaPublicKey, hash, ecdsaSignature)
    } else if (credential.algorithmId === coseAlgorithmRS256) {
      const rsaPublicKey = decodePKCS1RSAPublicKey(credential.publicKey)
      const hash = sha256(createAssertionSignatureMessage(authenticatorDataBytes, clientDataJSON))
      validSignature = verifyRSASSAPKCS1v15Signature(rsaPublicKey, sha256ObjectIdentifier, hash, signatureBytes)
    } else {
      throw new Error('Unsupported algorithm')
    }

    if (!validSignature) {
      throw new InvalidCredentialError(credentialId)
    }

    const {session, sessionToken} = this.sessionService.createSession(credential.userId, {
      twoFactorVerified: false,
    })

    return {session, sessionToken}
  }

  deletePasskeyCredential(userId: string, credentialId: Uint8Array): void {
    this.client.db.sql`DELETE FROM passkey_credential WHERE id = ${credentialId} AND user_id = ${userId}`
  }
}
