/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

import '@std/dotenv/load'

import {start} from '$fresh/server.ts'
import manifest from './fresh.gen.ts'
import config from '../fresh.config.ts'

await start(manifest, config)
