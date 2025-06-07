import {FileService} from '../../../../core/domain/file.ts'
import {Handlers} from 'fresh/compat'

export const handler: Handlers = {
  async GET(ctx) {
    const req = ctx.req
    const url = new URL(req.url)
    const fileKey = url.searchParams.get('fileKey')
    if (!fileKey) {
      return new Response('No fileKey found', {status: 400})
    }

    const fileService = new FileService()
    const {file, contentType, size} = await fileService.downloadFile(fileKey)

    return new Response(file.readable, {
      headers: {
        'Content-Length': size.toString(),
        'Content-Type': contentType || 'application/octet-stream',
      },
    })
  },
}
