export function redirect(location: string, status: 301 | 302 | 303 | 307 | 308, headers = new Headers()) {
  headers.set('location', location)
  return new Response(null, {status, headers})
}
