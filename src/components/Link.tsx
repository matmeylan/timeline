import {JSX} from 'preact'
import {clsx} from '@nick/clsx'

export function Link({class: classes, children, ...props}: JSX.HTMLAttributes<HTMLAnchorElement>) {
  return (
    <a class={clsx('font-medium transition hover:text-teal-500 dark:hover:text-teal-400', classes)} {...props}>
      {children}
    </a>
  )
}
