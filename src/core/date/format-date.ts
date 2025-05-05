export function formatDate(dateToFormat: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = new Intl.DateTimeFormat(undefined, options)
  return date.format(new Date(dateToFormat))
}
