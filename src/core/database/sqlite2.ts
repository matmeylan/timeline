import {PrismaClient} from '../../__generated__/prisma/client.ts'
import {PrismaBetterSQLite3} from '@prisma/adapter-better-sqlite3'

export function getClient() {
  const adapter = new PrismaBetterSQLite3({
    url: Deno.env.get('DATABASE_URL'),
  })
  const prisma = new PrismaClient({adapter})
  return prisma
}
