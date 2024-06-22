import {PrismaClient} from '../../../__generated__/prisma/deno/edge.ts'

// https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
const globalForPrisma = globalThis as unknown as {prisma: PrismaClient}

export type {PrismaClient as DatabaseClient}
export const database = globalForPrisma.prisma || new PrismaClient()

if (Deno.env.has('DEV_MODE')) {
  globalForPrisma.prisma = database
}
