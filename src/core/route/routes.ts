// Individual route exports (most tree-shakeable)
export const home = '/' as const
/** API */
export const api = '/api' as const
/** AUTH */
export const signup = '/signup' as const
export const login = '/login' as const
export const loginViaPasskey = '/login/passkey' as const
export const logout = '/logout' as const
export const twoFaPasskey = '/2fa/passkey' as const
export const verifyEmail = '/verify-email' as const
export const verifyEmailResend = '/verify-email-resend' as const
export const forgotPassword = '/forgot-password' as const
export const resetPassword = '/reset-password' as const
export const resetPasswordVerifyEmail = '/reset-password/verify-email' as const
export const settingsSecurity = '/settings/security' as const
export const settingsProfile = '/settings/profile' as const

/** /:user/ */
/** JOURNAL */
export const userHome = (user: string) => `/${user}`
export const startJournal = (user: string) => `/${user}/start`
export const journal = (user: string, journal: string) => `/${user}/${journal}`
export const writeJournalEntry = (user: string, journal: string) => `/${user}/${journal}/write`
export const editJournalEntry = (user: string, journal: string, entry: string) => `/${user}/${journal}/edit/${entry}`

/** All static routes of the application wired on the root '/' */
const Routes = [
  home,
  api,
  signup,
  login,
  loginViaPasskey,
  logout,
  verifyEmail,
  verifyEmailResend,
  forgotPassword,
  resetPassword,
  resetPasswordVerifyEmail,
  settingsSecurity,
  settingsProfile,
]

/** All static reserved routes of the application wired on the user '/[:user]/' */
const ROUTES_AT_USER: Array<(user: string) => string> = [startJournal]

export const RESERVED_ROUTES_AT_ROOT = (): string[] =>
  Routes.map(route => {
    const chunks = route.split('/')
    if (chunks.length === 0) throw new Error(`Wrongly configured route: ${route}`)
    if (chunks.length === 1) return chunks[0] // things like '/'
    if (chunks.length >= 2) return chunks[1] // all the base paths are reserved, users names can't override static routes
  }).filter((path): path is string => !!path && typeof path === 'string' && path.length > 0)

export const RESERVED_SLUGS_AT_USER = (): string[] => ROUTES_AT_USER.map(route => route('dummy').split('/dummy/')[1])
