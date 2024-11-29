import {forwardRef} from 'preact/compat'
import {JSX} from 'preact'
import {clsx} from '@nick/clsx'

export const ContainerOuter = forwardRef<HTMLDivElement, JSX.IntrinsicElements['div']>(function OuterContainer(
  {children, class: classes, ...props},
  ref,
) {
  return (
    <div ref={ref} class={clsx('sm:px-8', classes)} {...props}>
      <div class="mx-auto w-full max-w-7xl lg:px-8">{children}</div>
    </div>
  )
})

export const ContainerInner = forwardRef<HTMLDivElement, JSX.IntrinsicElements['div']>(function InnerContainer(
  {children, class: classes, ...props},
  ref,
) {
  return (
    <div ref={ref} class={clsx('relative px-4 sm:px-8 lg:px-12', classes)} {...props}>
      <div class="mx-auto max-w-2xl lg:max-w-5xl">{children}</div>
    </div>
  )
})

export const Container = forwardRef<HTMLDivElement, JSX.IntrinsicElements['div']>(function Container(
  {children, ...props},
  ref,
) {
  return (
    <ContainerOuter ref={ref} {...props}>
      <ContainerInner>{children}</ContainerInner>
    </ContainerOuter>
  )
})
