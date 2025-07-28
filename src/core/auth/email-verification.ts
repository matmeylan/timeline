import {EmailVerificationRequest} from '../domain/user/user.types.ts'
import {getCookies, setCookie, deleteCookie} from '@std/http'

const EMAIL_VERIFICATION_COOKIE_NAME = 'email_verification'

export function setEmailVerificationRequestCookie(headers: Headers, request: EmailVerificationRequest): void {
  setCookie(headers, {
    name: EMAIL_VERIFICATION_COOKIE_NAME,
    value: request.id,
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    expires: new Date(request.expiresAt),
    secure: (Deno.env.get('PROD') ?? false) == 'true',
  })
}

export function getEmailVerificationRequestCookie(headers: Headers): string | null {
  return getCookies(headers)[EMAIL_VERIFICATION_COOKIE_NAME] ?? null
}

export function deleteEmailVerificationCookie(headers: Headers) {
  return deleteCookie(headers, EMAIL_VERIFICATION_COOKIE_NAME)
}
