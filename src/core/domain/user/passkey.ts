import {SqliteClient} from '../../database/sqlite.ts'
import {
  CredentialNotFoundError,
  InvalidCredentialError,
  InvalidData,
  TooMany2faCredentialsError,
  WebAuthnUserCredential,
} from './passkey.types.ts'
import {
  decodePKIXECDSASignature,
  decodeSEC1PublicKey,
  ECDSAPublicKey,
  p256,
  verifyECDSASignature,
} from '@oslojs/crypto/ecdsa'
import {
  decodePKCS1RSAPublicKey,
  RSAPublicKey,
  sha256ObjectIdentifier,
  verifyRSASSAPKCS1v15Signature,
} from '@oslojs/crypto/rsa'
import {sha256} from '@oslojs/crypto/sha2'
import {
  type AttestationStatement,
  AttestationStatementFormat,
  type AuthenticatorData,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  type COSEEC2PublicKey,
  coseEllipticCurveP256,
  type COSERSAPublicKey,
  createAssertionSignatureMessage,
  parseAttestationObject,
  parseAuthenticatorData,
  parseClientDataJSON,
} from '@oslojs/webauthn'
import {SessionService} from './session.ts'
import {createWebAuthnChallenge, generateRandomCredentialsId} from '../../auth/webauthn.ts'

export class PasskeyService {
  constructor(
    private readonly client: SqliteClient = new SqliteClient(),
    private readonly sessionService: SessionService = new SessionService(client),
  ) {}

  createPasskeyChallenge() {
    const challenge = createWebAuthnChallenge()
    this.client.db.sql`INSERT INTO passkey_challenge (challenge) VALUES (${challenge})`
    return challenge
  }

  createPasskeyRegisterData(userId: string) {
    const credentials = this.getUserPasskeyCredentials(userId)
    const credentialUserId = generateRandomCredentialsId()
    const challenge = this.createPasskeyChallenge()
    return {challenge, credentials, credentialUserId}
  }

  verifyWebAuthnChallenge(challenge: Uint8Array) {
    using stmt = this.client.db.prepare(`DELETE from passkey_challenge WHERE challenge = :challenge`)
    return stmt.run({challenge}) > 0
  }

  parsePasskeyCreateCredentialData(userId: string, data: {attestationObject: Uint8Array; clientDataJSON: Uint8Array}) {
    let attestationStatement: AttestationStatement
    let authenticatorData: AuthenticatorData
    try {
      const attestationObject = parseAttestationObject(data.attestationObject)
      attestationStatement = attestationObject.attestationStatement
      authenticatorData = attestationObject.authenticatorData

      if (attestationStatement.format !== AttestationStatementFormat.None) {
        throw new Error('Invalid attestation format')
      }
      // TODO: Update host
      if (!authenticatorData.verifyRelyingPartyIdHash('localhost')) {
        throw new Error('Invalid host')
      }
      if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
        throw new Error('Invalid user in authenticator data')
      }
      if (authenticatorData.credential === null) {
        throw new Error('Invalid credential in authenticator data')
      }

      const clientData = parseClientDataJSON(data.clientDataJSON)
      if (clientData.type !== ClientDataType.Create) {
        throw new Error('Invalid client data type != create')
      }

      if (!this.verifyWebAuthnChallenge(clientData.challenge)) {
        throw new Error('Invalid challenge: challenge not found')
      }
      // TODO: Update origin
      if (clientData.origin !== 'http://localhost:8000') {
        throw new Error('Invalid client data origin')
      }
      if (clientData.crossOrigin !== null && clientData.crossOrigin) {
        throw new Error('Invalid client: cross origin')
      }

      const name = new Date().toISOString() // name is the date when it was generated ?
      let credential: WebAuthnUserCredential
      if (authenticatorData.credential.publicKey.algorithm() === coseAlgorithmES256) {
        let cosePublicKey: COSEEC2PublicKey
        try {
          cosePublicKey = authenticatorData.credential.publicKey.ec2()
        } catch {
          throw new Error('could not get public key')
        }
        if (cosePublicKey.curve !== coseEllipticCurveP256) {
          throw new Error('Invalid curve')
        }
        const encodedPublicKey = new ECDSAPublicKey(p256, cosePublicKey.x, cosePublicKey.y).encodeSEC1Uncompressed()
        credential = {
          id: authenticatorData.credential.id,
          userId: userId,
          algorithmId: coseAlgorithmES256,
          name,
          publicKey: encodedPublicKey,
        }
      } else if (authenticatorData.credential.publicKey.algorithm() === coseAlgorithmRS256) {
        let cosePublicKey: COSERSAPublicKey
        try {
          cosePublicKey = authenticatorData.credential.publicKey.rsa()
        } catch {
          throw new Error('Could not get rsa public key')
        }
        const encodedPublicKey = new RSAPublicKey(cosePublicKey.n, cosePublicKey.e).encodePKCS1()
        credential = {
          id: authenticatorData.credential.id,
          userId: userId,
          algorithmId: coseAlgorithmRS256,
          name,
          publicKey: encodedPublicKey,
        }
      } else {
        throw new Error('Unsupported algorithm')
      }
      return credential
    } catch (err) {
      console.error('Failed to parse passkey CREATE credential data', err)
      throw new InvalidData()
    }
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

  parsePasskeyGetCredentialData(data: {
    authenticatorData: Uint8Array
    clientDataJSON: Uint8Array
    credentialId: Uint8Array
    signature: Uint8Array
  }) {
    let authenticatorData: AuthenticatorData
    try {
      authenticatorData = parseAuthenticatorData(data.authenticatorData)

      // TODO: Update host
      if (!authenticatorData.verifyRelyingPartyIdHash('localhost')) {
        throw new Error('Invalid host')
      }
      if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
        throw new Error('Invalid user in authenticator data')
      }

      const clientData = parseClientDataJSON(data.clientDataJSON)
      if (clientData.type !== ClientDataType.Get) {
        throw new Error('Invalid client data type != Get')
      }

      if (!this.verifyWebAuthnChallenge(clientData.challenge)) {
        throw new Error('Invalid challenge: challenge not found')
      }
      // TODO: Update origin
      if (clientData.origin !== 'http://localhost:8000') {
        throw new Error('Invalid client origin')
      }
      if (clientData.crossOrigin !== null && clientData.crossOrigin) {
        throw new Error('Invalid clientData: cross origin')
      }

      return data
    } catch (err) {
      console.error('Failed to parse passkey GET credential data', err)
      throw new InvalidData()
    }
  }

  validateUserCredential(input: {
    authenticatorData: Uint8Array
    clientDataJSON: Uint8Array
    credentialId: Uint8Array
    signature: Uint8Array
  }) {
    const {authenticatorData, credentialId, clientDataJSON, signature} = input
    const credential = this.getPasskeyCredential(credentialId)

    let validSignature: boolean
    if (credential.algorithmId === coseAlgorithmES256) {
      const ecdsaSignature = decodePKIXECDSASignature(signature)
      const ecdsaPublicKey = decodeSEC1PublicKey(p256, credential.publicKey)
      const hash = sha256(createAssertionSignatureMessage(authenticatorData, clientDataJSON))
      validSignature = verifyECDSASignature(ecdsaPublicKey, hash, ecdsaSignature)
    } else if (credential.algorithmId === coseAlgorithmRS256) {
      const rsaPublicKey = decodePKCS1RSAPublicKey(credential.publicKey)
      const hash = sha256(createAssertionSignatureMessage(authenticatorData, clientDataJSON))
      validSignature = verifyRSASSAPKCS1v15Signature(rsaPublicKey, sha256ObjectIdentifier, hash, signature)
    } else {
      throw new Error('Unsupported algorithm')
    }

    if (!validSignature) {
      throw new InvalidCredentialError(credentialId)
    }

    const {session, sessionToken} = this.sessionService.createSession(credential.userId)
    return {session, sessionToken}
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

  deletePasskeyCredential(userId: string, credentialId: Uint8Array) {
    this.client.db.sql`DELETE FROM passkey_credential WHERE id = ${credentialId} AND user_id = ${userId}`
    return this.getUserPasskeyCredentials(userId)
  }
}
