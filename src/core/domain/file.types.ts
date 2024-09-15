import {Model} from '../database/model.types.ts'

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024

export interface File extends Model {
  fileKey: string
  fileName: string
  originalSizeInBytes: string
  contentType: string
  createdAt: Date | string // ISO-8601
}

export interface FileUploadRequest {
  fileName: string
  size: number
  contentType: string
  prefix?: string
}

export interface FileUpload {
  fileKey: string
  size: string
  contentType: string
  body: ReadableStream<Uint8Array>
}
