import {JSX} from 'preact'
import {clsx} from '@nick/clsx'

export function Prose({class: classes, dangerouslySetInnerHTML, ...props}: JSX.IntrinsicElements['div']) {
  return (
    <div
      class={clsx('prose dark:prose-invert', classes)}
      dangerouslySetInnerHTML={dangerouslySetInnerHTML}
      {...props}
    />
  )
}
