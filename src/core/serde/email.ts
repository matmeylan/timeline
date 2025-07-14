export function normalizeEmail(email: string) {
  return email.toLowerCase().trim()
}

export const EMAIL_VALIDATION_PATTERN = /^.+@.+\..+$/
