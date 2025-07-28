export function redirect(path: string, status: number, headers = new Headers()) {
  headers.set('location', path)
  return new Response(null, {status, headers})
}
