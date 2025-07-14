import {ZodError} from '@zod/zod'

export interface Zodable<T> {
  toZod(): ZodError<T>
}
