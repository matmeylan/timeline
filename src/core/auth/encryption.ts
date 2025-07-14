import {createCipheriv, createDecipheriv} from 'node:crypto'
import {DynamicBuffer} from '@oslojs/binary'
import {decodeBase64} from '@oslojs/encoding'

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!
const key = decodeBase64(ENCRYPTION_KEY)

export function encrypt(data: Uint8Array): Uint8Array {
  const iv = new Uint8Array(16)
  crypto.getRandomValues(iv)
  const cipher = createCipheriv('aes-128-gcm', key, iv)
  const encrypted = new DynamicBuffer(0)
  encrypted.write(iv)
  encrypted.write(cipher.update(data))
  encrypted.write(cipher.final())
  encrypted.write(cipher.getAuthTag())
  return encrypted.bytes()
}

export function encryptString(data: string): Uint8Array {
  return encrypt(new TextEncoder().encode(data))
}
