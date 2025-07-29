import {Handlers} from '$fresh/server.ts'
import {join} from '@std/path'
import {z} from '@zod/zod'
import {FileUploadRequest, MAX_UPLOAD_SIZE} from '../../../../core/domain/file.types.ts'
import {FileService} from '../../../../core/domain/file.ts'
import type {User} from '../../../../core/domain/user/user.types.ts'

export const handler: Handlers = {
  async PUT(req, ctx) {
    if (!req?.body) {
      return Response.json({error: 'No body found'}, {status: 400})
    }
    const fileService = new FileService()
    const u = new URL(req.url)
    const params = UploadFileRequest.safeParse({
      size: Number(u.searchParams.get('size')),
      contentType: u.searchParams.get('contentType'),
      fileKey: u.searchParams.get('fileKey'),
    })
    if (!params.success) {
      return Response.json({error: params.error}, {status: 400})
    }
    const contentLength = req.headers.get('content-length')
    const fileSize = contentLength ? parseInt(contentLength) : params.data.size
    if (fileSize > MAX_UPLOAD_SIZE) {
      return Response.json({error: `Max file size is MAX_UPLOAD_SIZE bytes`}, {status: 413})
    }

    const downloadUrl = await fileService.uploadFile({
      fileKey: params.data.fileKey,
      body: req.body,
      size: params.data.size.toString(),
      contentType: params.data.contentType,
    })
    return Response.json({downloadUrl}, {status: 200})
  },
}

export class LocalFileStorage {
  private readonly rootDir: string

  constructor(rootDir: string | undefined = Deno.env.get('LOCAL_FILE_STORAGE_ROOT')) {
    rootDir = rootDir || Deno.env.get('LOCAL_FILE_STORAGE_ROOT')
    if (!rootDir) {
      throw new Error('No root dir specified, please set LOCAL_FILE_STORAGE_ROOT')
    }
    this.rootDir = rootDir
  }

  generateUploadSignedUrl(request: FileUploadRequest, user: User) {
    const {fileName, size, contentType, prefix} = request
    const namespace = `user/${user.username}`
    const uniqueFolder = crypto.randomUUID() // allows to keep filenames unique
    const fileKey = join(namespace, prefix || '', uniqueFolder, fileName)

    // it's local, we don't  sign anything - this should not be used in production
    return `/api/files/upload/local?size=${size}&contentType=${encodeURIComponent(contentType)}&fileKey=${encodeURIComponent(fileKey)}`
  }

  async uploadFile(fileKey: string, body: ReadableStream<Uint8Array>) {
    const filePath = join(this.rootDir, fileKey)
    const parentDir = join(this.rootDir, fileKey, '..')

    await Deno.mkdir(parentDir, {recursive: true})
    using f = await Deno.open(filePath, {create: true, write: true})
    await body.pipeTo(f.writable)
    return '/api/files/download?fileKey=' + encodeURIComponent(fileKey)
  }

  downloadFile(fileKey: string) {
    const filePath = join(this.rootDir, fileKey)
    return Deno.open(filePath, {read: true})
  }
}

const UploadFileRequest = z.object({
  size: z.number(),
  contentType: z.string(),
  fileKey: z.string(),
})
