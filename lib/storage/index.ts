import { put } from '@vercel/blob'

export async function storePrivateAsset(pathname: string, body: Blob | ArrayBuffer | ReadableStream, contentType?: string) {
  return put(pathname, body, { access: 'private', contentType, addRandomSuffix: false })
}
