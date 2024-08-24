import {BindValue} from '@db/sqlite'

export interface Model extends Record<string, BindValue> {}
