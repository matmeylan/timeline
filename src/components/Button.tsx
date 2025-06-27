import {JSX, cloneElement, VNode} from 'preact'

function Hero(props: JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      class={[
        'cursor-pointer rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',
        props.class,
      ].join(' ')}
    >
      {props.children}
    </button>
  )
}

function Primary<C extends JSX.ElementType = 'button'>(
  props: JSX.HTMLAttributes<HTMLButtonElement> & {as?: C; icon?: VNode<any>},
) {
  // TODO: dark mode
  // [@media(prefers-color-scheme:dark)]:fill-teal-500 [@media(prefers-color-scheme:dark)]:stroke-teal-50 [@media(prefers-color-scheme:dark)]:group-hover:fill-teal-600 [@media(prefers-color-scheme:dark)]:group-hover:stroke-teal-50
  const icon = props.icon
    ? cloneElement(props.icon, {
        class: [
          'fill-teal-500 transition group-hover:fill-teal-700 group-hover:stroke-teal-200 h-3 w-3',
          props.icon.props?.class,
        ]
          .filter(Boolean)
          .join(' '),
      })
    : null
  const Component: JSX.ElementType = props.as || 'button'

  return (
    <Component
      {...props}
      class={[
        'group flex cursor-pointer flex-row items-center gap-2 text-sm/6 font-semibold text-teal-500 hover:text-teal-700',
        props.class,
      ].join(' ')}
    >
      {props.children}
      {icon}
    </Component>
  )
}

function Secondary<C extends JSX.ElementType = 'button'>(
  props: JSX.HTMLAttributes<HTMLButtonElement> & {as?: C; icon?: VNode<any>},
) {
  // TODO: dark mode
  // [@media(prefers-color-scheme:dark)]:fill-teal-500 [@media(prefers-color-scheme:dark)]:stroke-teal-50 [@media(prefers-color-scheme:dark)]:group-hover:fill-teal-600 [@media(prefers-color-scheme:dark)]:group-hover:stroke-teal-50
  const icon = props.icon
    ? cloneElement(props.icon, {
        class: [
          'fill-zinc-500 transition group-hover:fill-zinc-700 group-hover:stroke-zinc-200 h-3 w-3',
          props.icon.props?.class,
        ]
          .filter(Boolean)
          .join(' '),
      })
    : null
  const Component: JSX.ElementType = props.as || 'button'

  return (
    <Component
      {...props}
      class={[
        'group flex cursor-pointer flex-row items-center gap-2 text-sm/6 font-semibold text-zinc-500 hover:text-zinc-700',
        props.class,
      ].join(' ')}
    >
      {props.children}
      {icon}
    </Component>
  )
}

export const Button = {
  Hero,
  Secondary,
  Primary,
}
