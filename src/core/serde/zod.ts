import {ZodError} from '@zod/zod'

export interface Zodable {
  toZod(): ZodError
}
