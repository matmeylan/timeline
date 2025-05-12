import {JSX} from 'preact'
import {IS_BROWSER} from '$fresh/runtime.ts'

export function Button(props: JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={!IS_BROWSER || props.disabled}
      class="rounded-sm border-2 border-gray-500 bg-white px-2 py-1 transition-colors hover:bg-gray-200"
    />
  )
}
