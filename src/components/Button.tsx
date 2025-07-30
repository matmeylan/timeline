import {JSX} from 'preact'
import {cva, type VariantProps} from 'class-variance-authority'

const buttonVariants = cva(
  "group inline-flex cursor-pointer flex-row items-center justify-center whitespace-nowrap rounded-md gap-2 text-sm/6 font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:transition-colors [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-primary focus:ring-offset-2 focus-visible:outline-none focus-visible:ring-[2px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/80 [&_svg]:fill-primary [&_svg]:stroke-primary',
        destructive:
          'bg-destructive-foreground text-destructive hover:text-destructive-foreground hover:bg-destructive shadow-xs hover:bg-destructive/80 focus-visible:!ring-destructive dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 hover:[&_svg]:fill-accent-foreground hover:[&_svg]:stroke-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 [&_svg]:fill-secondary-foreground [&_svg]:stroke-secondary-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary font-medium hover:text-primary/80',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export function Button<C extends JSX.ElementType = 'button'>({
  class: classes,
  children,
  variant,
  size,
  ...props
}: JSX.HTMLAttributes<HTMLButtonElement> & {as?: C} & VariantProps<typeof buttonVariants>) {
  const Component: JSX.ElementType = props.as || 'button'
  return (
    <Component class={buttonVariants({variant, size, class: classes})} {...props}>
      {children}
    </Component>
  )
}
