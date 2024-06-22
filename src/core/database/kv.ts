export function openKv() {
  return Deno.openKv(Deno.env.get('DATABASE_PATH'))
}
