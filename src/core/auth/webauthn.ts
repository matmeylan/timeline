export function createWebAuthnChallenge(): Uint8Array {
  const challenge = new Uint8Array(20)
  crypto.getRandomValues(challenge)
  return challenge
}

export function generateRandomCredentialsId(): Uint8Array {
  const token = new Uint8Array(8)
  crypto.getRandomValues(token)
  return token
}
