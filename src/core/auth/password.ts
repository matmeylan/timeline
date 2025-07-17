import {hash, verify} from '@node-rs/argon2'
import {encodeBase32UpperCaseNoPadding, encodeHexLowerCase} from '@oslojs/encoding'
import {sha1} from '@oslojs/crypto/sha1'
import {deleteCookie, getCookies, setCookie} from '@std/http/cookie'

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })
}

export function generateRandomRecoveryCode(): string {
  const recoveryCodeBytes = new Uint8Array(10)
  crypto.getRandomValues(recoveryCodeBytes)
  const recoveryCode = encodeBase32UpperCaseNoPadding(recoveryCodeBytes)
  return recoveryCode
}

export async function verifyPasswordStrength(password: string): Promise<boolean> {
  if (password.length < 8 || password.length > 255) {
    return false
  }
  const hash = encodeHexLowerCase(sha1(new TextEncoder().encode(password)))
  const hashPrefix = hash.slice(0, 5)
  const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`)
  const data = await response.text()
  const items = data.split('\n')
  for (const item of items) {
    const hashSuffix = item.slice(0, 35).toLowerCase()
    if (hash === hashPrefix + hashSuffix) {
      return false
    }
  }
  return true
}

export function generateRandomOTP(): string {
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  const code = encodeBase32UpperCaseNoPadding(bytes)
  return code
}

export async function verifyPasswordHash(hash: string, password: string): Promise<boolean> {
  return await verify(hash, password)
}

const PASSWORD_RESET_SESSION_COOKIE_NAME = 'password_reset_session'

export function setPasswordResetSessionTokenCookie(headers: Headers, token: string, expiresAt: Date): void {
  setCookie(headers, {
    name: PASSWORD_RESET_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    expires: new Date(expiresAt),
    secure: (Deno.env.get('PROD') ?? false) == 'true',
  })
}

export function getPasswordResetSessionTokenCookie(headers: Headers): string | null {
  return getCookies(headers)[PASSWORD_RESET_SESSION_COOKIE_NAME] ?? null
}

export function deletePasswordResetSessionTokenCookie(headers: Headers) {
  return deleteCookie(headers, PASSWORD_RESET_SESSION_COOKIE_NAME)
}
