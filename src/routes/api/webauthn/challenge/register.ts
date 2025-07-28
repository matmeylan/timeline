import {Handlers} from '$fresh/server.ts'
import {RefillingTokenBucket} from '../../../../core/auth/rate-limit.ts'
import {createWebAuthnChallenge, generateRandomCredentialsId} from '../../../../core/auth/webauthn.ts'
import {encodeBase64} from '@oslojs/encoding'
import {PasskeyService} from '../../../../core/domain/user/passkey.ts'
import {getSessionTokenCookie} from '../../../../core/auth/session.ts'
import {UserService} from '../../../../core/domain/user/user.ts'

const rateLimitBucket = new RefillingTokenBucket<string>(30, 10)

export const handler: Handlers = {
  POST(req, ctx) {
    // TODO: Assumes X-Forwarded-For is always included.
    const clientIP = req.headers.get('X-Forwarded-For')
    if (clientIP !== null && !rateLimitBucket.consume(clientIP, 1)) {
      return new Response('Too many requests', {status: 429})
    }

    const token = getSessionTokenCookie(req.headers)
    if (!token) {
      return new Response('Unauthenticated', {status: 401})
    }

    const userService = new UserService()
    const {session, user} = userService.validateSessionToken(token)
    if (!session || !user) {
      return new Response('Forbidden', {status: 403})
    }

    const passkeyService = new PasskeyService()
    const credentials = passkeyService.getUserPasskeyCredentials(user.id)
    const credentialUserId = generateRandomCredentialsId()
    const challenge = createWebAuthnChallenge()

    return new Response(
      JSON.stringify({
        challenge: encodeBase64(challenge),
        user: {email: user.email},
        credentialUserId: encodeBase64(credentialUserId),
        credentialIds: credentials.map(c => encodeBase64(c.id)),
      }),
    )
  },
}
