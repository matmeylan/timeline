import {Handlers} from '$fresh/server.ts'
import {RefillingTokenBucket} from '../../../core/auth/rate-limit.ts'
import {createWebAuthnChallenge} from '../../../core/auth/webauthn.ts'
import {encodeBase64} from '@oslojs/encoding'

const rateLimitBucket = new RefillingTokenBucket<string>(30, 10)

export const handler: Handlers = {
  POST(req, ctx) {
    // TODO: Assumes X-Forwarded-For is always included.
    const clientIP = req.headers.get('X-Forwarded-For')
    if (clientIP !== null && !rateLimitBucket.consume(clientIP, 1)) {
      return new Response('Too many requests', {status: 429})
    }
    const challenge = createWebAuthnChallenge()
    return new Response(JSON.stringify({challenge: encodeBase64(challenge)}))
  },
}
