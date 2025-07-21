import {encodeHexLowerCase} from '@oslojs/encoding'
import z from '@zod/zod'

// TODO: state out of app
const challengeBucket = new Set<string>()

export function createWebAuthnChallenge(): Uint8Array {
  const challenge = new Uint8Array(20)
  crypto.getRandomValues(challenge)
  const encoded = encodeHexLowerCase(challenge)
  challengeBucket.add(encoded)
  return challenge
}

export function generateRandomCredentialsId(): Uint8Array {
  const token = new Uint8Array(8)
  crypto.getRandomValues(token)
  return token
}

export function verifyWebAuthnChallenge(challenge: Uint8Array): boolean {
  const encoded = encodeHexLowerCase(challenge)
  return challengeBucket.delete(encoded)
}
