import {z} from '@zod/zod'
import {Handlers} from '$fresh/server.ts'
import {FileService} from '../../../../core/domain/file.ts'
import {getSessionTokenCookie} from '../../../../core/auth/session.ts'
import {SessionService} from '../../../../core/domain/user/session.ts'
import {JournalService} from '../../../../core/domain/journal.ts'

export const handler: Handlers = {
  async POST(req, ctx) {
    const token = getSessionTokenCookie(req.headers)
    if (!token) {
      return new Response('Unauthenticated', {status: 401})
    }

    const sessionService = new SessionService()
    const {user} = sessionService.validateSessionToken(token)
    if (!user) {
      return new Response('Forbidden', {status: 403})
    }

    const body = await req.json()
    const res = GenerateUploadSignedUrlRequest.safeParse(body)
    if (!res.success) {
      return Response.json({error: res.error}, {status: 400})
    }

    const {contentType, fileName, size, journalId} = res.data
    const journalService = new JournalService()
    const journal = journalService.getJournalById(journalId)
    if (journal.ownerId !== user.id) {
      return Response.json('Forbidden', {status: 403})
    }

    const fileService = new FileService()
    return Response.json(
      {
        uploadUrl: fileService.generateUploadSignedUrl(
          {
            fileName,
            size,
            contentType,
            prefix: journal.slug,
          },
          user,
        ),
      },
      {status: 200},
    )
  },
}

const GenerateUploadSignedUrlRequest = z.object({
  fileName: z.string(),
  size: z.number(),
  contentType: z.string(),
  journalId: z.string(),
})
