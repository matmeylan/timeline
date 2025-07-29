// deno-lint-ignore-file react-rules-of-hooks
import {MAX_UPLOAD_SIZE} from '../../core/domain/file.types.ts'
import {useEffect, useRef, useState} from 'preact/hooks'
import {IS_BROWSER} from '$fresh/runtime.ts'
import {Crepe} from '@milkdown/crepe'
import type {RefObject} from 'npm:@types/react@18.3.20'

export interface ContentEditorProps {
  content?: string
  inputName: string
  journalId: string
}

export default function ContentEditor(props: ContentEditorProps) {
  if (!IS_BROWSER) {
    return <div></div>
  }
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (containerRef.current) {
      prepareCrepe(containerRef.current, props, inputRef).then(() => {
        setLoading(false)
      })
    }
  }, [])

  const containerClasses = (loading ? 'hidden ' : '') + 'rounded-sm border border-zinc-400'
  return (
    <>
      <link rel="stylesheet" href="/styles/vendors/milkdown/theme/common/style.css" />
      <link rel="stylesheet" href="/styles/vendors/milkdown/theme/nord/style.css" />
      <input ref={inputRef} type="hidden" id={props.inputName} name={props.inputName} />
      {loading && <div>Loading ...</div>}
      <div ref={containerRef} class={containerClasses}></div>
    </>
  )
}

async function prepareCrepe(root: HTMLDivElement, props: ContentEditorProps, inputRef: RefObject<HTMLInputElement>) {
  const crepe = new Crepe({
    root,
    defaultValue: props.content,
    features: {
      [Crepe.Feature.Latex]: false,
    },
    featureConfigs: {
      [Crepe.Feature.ImageBlock]: {
        onUpload: (file: File) => startSignedUpload(file, props.journalId),
      },
      [Crepe.Feature.Placeholder]: {
        text: 'What happened ?',
        mode: 'doc',
      },
    },
  })

  await crepe.create()

  // update the input ref value with the markdown from the editor
  crepe.on(listener => {
    listener.markdownUpdated((ctx, markdown, prev) => {
      if (inputRef.current) {
        inputRef.current.value = markdown
      }
    })
  })

  return crepe
}

async function startSignedUpload(file: File, journalId: string) {
  // TODO: gracefully handle
  if (file.size > MAX_UPLOAD_SIZE) {
    console.warn('File is too large', {file})
    throw new Error('File is too large')
  }

  const {uploadUrl} = await generateUploadSignedUrl(file, journalId)
  const res = await uploadFile(file, uploadUrl)

  console.log('Upload finished !', {res, file})
  return res.downloadUrl
}

async function generateUploadSignedUrl(file: File, journalId: string): Promise<{uploadUrl: string}> {
  const res = await fetch('/api/files/upload', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      size: file.size,
      contentType: file.type,
      journalId,
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

function uploadFile(file: File, signedUrl: string): Promise<{downloadUrl: string}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl, true)
    xhr.setRequestHeader('Content-Type', file.type)
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
