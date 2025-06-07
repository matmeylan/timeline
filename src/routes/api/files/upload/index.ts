import {z} from '$zod'
import {FileService} from '../../../../core/domain/file.ts'
import {Handlers} from 'fresh/compat'

export const handler: Handlers = {
  async POST(ctx) {
    const req = ctx.req
    const body = await req.json()
    const res = GenerateUploadSignedUrlRequest.safeParse(body)
    if (!res.success) {
      return Response.json({error: res.error}, {status: 400})
    }

    const {contentType, fileName, size, prefix} = res.data
    const fileService = new FileService()
    return Response.json(
      {
        uploadUrl: fileService.generateUploadSignedUrl({
          fileName,
          size,
          contentType,
          prefix,
        }),
      },
      {status: 200},
    )
  },
}

const GenerateUploadSignedUrlRequest = z.object({
  fileName: z.string(),
  size: z.number(),
  contentType: z.string(),
  prefix: z
    .string()
    .optional()
    .refine(val => !val || /[a-z0-9]+$/.test(val), {
      message: 'Prefix can only be a single URL segment (lowercase and alphanumeric)',
    }),
})
