import {signal} from '@preact/signals'
import {MAX_UPLOAD_SIZE} from '../core/domain/file.types.ts'

const images = signal([] as string[])

export default function FileUpload() {
  const handleFiles = async (e: Event) => {
    const target = e.target as HTMLInputElement
    if (!target.files) return
    for (const f of target.files) {
      if (f.size > MAX_UPLOAD_SIZE) {
        console.warn('File is too large', {f})
        continue
      }
      const {uploadUrl} = await generateUploadSignedUrl(f)
      const res = await uploadFile(f, uploadUrl)
      console.log('Upload finished !', {res, f})
      images.value = [...images.value, res.downloadUrl]
    }
  }

  return (
    <>
      <input type="file" accept="image/*" multiple onChange={handleFiles} />
      {images.value.map((img, i) => (
        <img key={i} src={img} alt="" width={120} className="block" />
      ))}
    </>
  )
}

async function generateUploadSignedUrl(file: File): Promise<{uploadUrl: string}> {
  const res = await fetch('/api/files/upload', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      size: file.size,
      contentType: file.type,
      prefix: 'abc',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (res.ok) {
    return res.json()
  } else {
    throw new FileUploadError('Failed to upload file', {cause: res.text()})
  }
}

async function uploadFile(file: File, signedUrl: string): Promise<{downloadUrl: string}> {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })
  if (res.ok) {
    return res.json()
  } else {
    throw new FileUploadError('Failed to upload file', {cause: res.text()})
  }
}

export class FileUploadError extends Error {}
