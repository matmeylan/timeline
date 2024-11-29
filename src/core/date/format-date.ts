export function formatDate(dateToFormat: string | Date): string {
  const date = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
  return date.format(new Date(dateToFormat))
}
