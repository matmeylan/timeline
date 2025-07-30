import {JSX} from 'preact'
import {clsx} from '@nick/clsx'

export function FormField({class: classes, children, ...props}: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div class={clsx('flex flex-col gap-1', classes)} {...props}>
      {children}
    </div>
  )
}

export function Label({class: classes, children, ...props}: JSX.HTMLAttributes<HTMLLabelElement>) {
  return (
    <label class={clsx('mb-1 block text-sm font-medium text-gray-700', classes)} {...props}>
      {children}
    </label>
  )
}

export function Input({class: classes, ...props}: JSX.HTMLAttributes<HTMLInputElement>) {
  return (
    <input
      class={clsx(
        'rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none',
        classes,
      )}
      {...props}
    />
  )
}

export function Description({class: classes, children, ...props}: JSX.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p class={clsx('text-xs text-gray-500', classes)} {...props}>
      {children}
    </p>
  )
}

export function Error({class: classes, children, ...props}: JSX.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div class={clsx('text-sm text-red-600', classes)} {...props}>
      {children}
    </div>
  )
}
