import {SqliteClient} from '../database/sqlite.ts'
import {LocalFileStorage} from '../../routes/api/files/upload/local.ts'
import {File, FileUpload, FileUploadRequest} from './file.types.ts'
import type {User} from './user/user.types.ts'

export class FileService {
  constructor(
    private readonly client: SqliteClient = new SqliteClient(),
    private readonly storage: LocalFileStorage = new LocalFileStorage(),
  ) {}

  generateUploadSignedUrl(request: FileUploadRequest, user: User) {
    return this.storage.generateUploadSignedUrl(request, user)
  }

  async uploadFile(request: FileUpload) {
    // TODO: limit size
    const url = await this.storage.uploadFile(request.fileKey, request.body)
    const file: File = {
      createdAt: new Date().toISOString(),
      contentType: request.contentType,
      fileKey: request.fileKey,
      fileName: request.fileKey.split('/').pop() || '',
      originalSizeInBytes: request.size,
    }
    const stmt = this.client.db.prepare(`
        INSERT INTO file (fileKey, createdAt, fileName, contentType, originalSizeInBytes)
        VALUES (:fileKey, :createdAt, :fileName, :contentType, :originalSizeInBytes)
    `)
    stmt.run(file)
    return url
  }

  async downloadFile(fileKey: string) {
    const fileRecord = await this.client.db.prepare('SELECT * FROM file WHERE fileKey = :fileKey').get<File>({fileKey})
    if (!fileRecord) {
      throw new Error('File not found')
    }
    const file = await this.storage.downloadFile(fileKey)
    return {
      file,
      size: fileRecord.originalSizeInBytes,
      contentType: fileRecord.contentType,
    }
  }
}
