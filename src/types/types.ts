/**
 * Definitions of web component types with emphasis on extending
 * JSX.IntrinsicElements. This is required to be able to use a custom
 * element in a .tsx page without showing TypeScript errors in vscode.
 */
import {JSX} from 'preact'

/** https://tailwindcss.com/plus/ui-blocks/documentation/dropdown-menu#el-menu */
interface DropdownMenu extends JSX.HTMLAttributes<HTMLElement> {
  popover?: boolean
  open?: boolean
  anchor?: string // (top | right | bottom | left) & (start | end)
}

declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements {
      // This fixes "Property 'template' does not exist on JSX.IntrinsicElements" error
      // template: JSX.HTMLAttributes<HTMLTemplateElement>
      'el-dropdown': JSX.HTMLAttributes<HTMLElement> // https://tailwindcss.com/plus/ui-blocks/documentation/dropdown-menu#el-dropdown
      'el-menu': DropdownMenu
    }
  }
}
