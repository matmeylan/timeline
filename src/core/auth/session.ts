import {encodeBase32LowerCaseNoPadding} from '@oslojs/encoding'
import {setCookie, getCookies, deleteCookie} from '@std/http'

export function generateSessionToken(): string {
  const tokenBytes = new Uint8Array(20)
  crypto.getRandomValues(tokenBytes)
  const token = encodeBase32LowerCaseNoPadding(tokenBytes)
  return token
}

export const SESSION_COOKIE_NAME = 'session'

export function setSessionTokenCookie(headers: Headers, token: string, expiresAt: Date | string): void {
  setCookie(headers, {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    expires: new Date(expiresAt),
    secure: (Deno.env.get('PROD') ?? false) == 'true',
  })
}

export function getSessionTokenCookie(headers: Headers) {
  return getCookies(headers)[SESSION_COOKIE_NAME] ?? null
}

export function deleteSessionTokenCookie(headers: Headers) {
  deleteCookie(headers, SESSION_COOKIE_NAME)
}
