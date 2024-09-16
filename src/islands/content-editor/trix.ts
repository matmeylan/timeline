import {JSX} from 'preact'

/**
 * Reverse engineered types, as there is little doc and no type definition found.
 * This is definitely missing types and existing types may be inaccurate.
 */

// region custom element <trix-editor>
declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements {
      'trix-editor': TrixEditorAttributes
    }
  }
}

interface TrixEditorAttributes extends JSX.HTMLAttributes<HTMLElement> {
  autofocus?: boolean
  placeholder?: string
  input?: string
}

// region event listeners
declare global {
  interface Document {
    addEventListener(type: 'trix-file-accept', listener: (event: Event & {file?: File}) => void): undefined
    addEventListener(
      type: 'trix-attachment-add',
      listener: (event: Event & {attachment?: TrixAttachment}) => void,
    ): undefined
  }
}

export type TrixSetProgressFn = (progress: number) => void
export type TrixSetAttributesFn = (attributes: Record<string, unknown>) => void

export interface TrixAttachment {
  file: File
  setUploadProgress: TrixSetProgressFn
  setAttributes: TrixSetAttributesFn
}
