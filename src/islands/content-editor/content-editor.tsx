import {IS_BROWSER} from '$fresh/runtime.ts'
import {MAX_UPLOAD_SIZE} from '../../core/domain/file.types.ts'
import {ComponentChildren} from 'preact'
import {useEffect} from 'preact/hooks'
import {TrixAttachment, TrixSetAttributesFn, TrixSetProgressFn} from './trix.ts'

function TrixProvider(props: {children: ComponentChildren}) {
  // not loaded and rendered on the server
  if (!IS_BROWSER) {
    return <></>
  }
  useEffect(() => registerListeners(), [])
  return (
    <>
      <link rel="stylesheet" href="/styles/trix.css" />
      <script type="text/javascript" src="https://unpkg.com/trix@2.1.5/dist/trix.umd.js" crossOrigin="" />
      {props.children}
    </>
  )
}

export default function ContentEditor(props: {input?: string; placeholder?: string}) {
  return (
    <TrixProvider>
      <trix-editor autofocus={true} placeholder={props?.placeholder} input={props?.input}></trix-editor>
    </TrixProvider>
  )
}

function registerListeners() {
  document.addEventListener('trix-file-accept', event => {
    const file = event.file
    if (file && file.size > MAX_UPLOAD_SIZE) {
      console.warn('File is too large', {file})
      event.preventDefault()
      return
    }
  })
  document.addEventListener('trix-attachment-add', event => {
    if (event.attachment?.file) {
      uploadFileAttachment(event.attachment)
    }
  })
}

function uploadFileAttachment(attachment: TrixAttachment) {
  function setProgress(progress: number) {
    attachment.setUploadProgress(progress)
  }

  function setAttributes(attributes: Record<string, unknown>) {
    attachment.setAttributes(attributes)
  }

  return startUploadFile(attachment.file, setProgress, setAttributes)
}

async function startUploadFile(file: File, setProgress: TrixSetProgressFn, setAttributes: TrixSetAttributesFn) {
  const {uploadUrl} = await generateUploadSignedUrl(file)
  const res = await uploadFile(file, uploadUrl, setProgress)

  setAttributes({url: res.downloadUrl, href: res.downloadUrl})
  console.log('Upload finished !', {res, file})
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

function uploadFile(
  file: File,
  signedUrl: string,
  progressCallback: TrixSetProgressFn,
): Promise<{downloadUrl: string}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl, true)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.addEventListener('progress', function (event) {
      const progress = (event.loaded / event.total) * 100
      progressCallback(progress)
    })
    xhr.addEventListener('loadend', event => {
      if (xhr.status == 200) {
        return resolve(JSON.parse(xhr.responseText))
      } else {
        return reject(new FileUploadError(`${xhr.status} ${xhr.statusText}: ${xhr.responseText}`))
      }
    })
    xhr.addEventListener('timeout', event => {
      return reject(new FileUploadError(`File upload timed out`))
    })

    xhr.send(file)
  })
}

export class FileUploadError extends Error {}
