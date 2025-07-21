export interface WebAuthnUserCredential {
  id: Uint8Array
  userId: string
  name: string
  algorithmId: number
  publicKey: Uint8Array
}

export class TooMany2faCredentialsError extends Error {
  constructor(readonly limit: number) {
    super(`Too many credentials, you can have up to ${limit}`)
  }
}

export class CredentialNotFoundError extends Error {
  constructor(readonly credentialId: Uint8Array) {
    super(`Credential not found`)
  }
}

export class InvalidCredentialError extends Error {
  constructor(readonly credentialId: Uint8Array) {
    super(`Credential signature is not valid`)
  }
}
