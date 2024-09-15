import {Handlers} from '$fresh/server.ts'
import {FileService} from '../../../../core/domain/file.ts'

export const handler: Handlers = {
  async GET(req, ctx) {
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
