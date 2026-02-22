import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_BUCKETS = ['product-images', 'logos'] as const
type AllowedBucket = typeof ALLOWED_BUCKETS[number]

/**
 * Tenta di creare il bucket se non esiste.
 * Ignora l'errore "already exists" — è normale.
 * Lancia un errore solo se la creazione fallisce per altra ragione.
 */
async function ensureBucket(db: ReturnType<typeof getServiceClient>, BUCKET: AllowedBucket): Promise<void> {
  const { error } = await db.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_SIZE_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  })

  // "already exists" non è un problema — il bucket c'è già
  if (error) {
    const msg = error.message.toLowerCase()
    if (!msg.includes('already exist') && !msg.includes('duplicate') && !msg.includes('unique')) {
      throw new Error(`Impossibile creare il bucket '${BUCKET}': ${error.message}`)
    }
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Impossibile leggere il file' }, { status: 400 })
  }

  // Bucket opzionale — default product-images, accetta anche 'logos'
  const bucketParam = (formData.get('bucket') as string | null) ?? 'product-images'
  const BUCKET: AllowedBucket = ALLOWED_BUCKETS.includes(bucketParam as AllowedBucket)
    ? (bucketParam as AllowedBucket)
    : 'product-images'

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo immagini (JPG, PNG, WEBP, SVG)' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File troppo grande (max 5 MB)' }, { status: 400 })
  }

  // Estende ext da MIME type (image/jpeg → jpg, image/svg+xml → svg)
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  }
  const ext = mimeToExt[file.type] ?? 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`

  const db = getServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  // Primo tentativo di upload
  let { error: uploadError } = await db.storage.from(BUCKET).upload(filename, buffer, {
    contentType: file.type,
    upsert: false,
  })

  // Se il bucket non esiste → lo creiamo e riproviamo una volta sola
  if (uploadError) {
    const errMsg = uploadError.message.toLowerCase()
    const isBucketMissing =
      errMsg.includes('bucket not found') ||
      errMsg.includes("doesn't exist") ||
      errMsg.includes('not found') ||
      errMsg.includes('no such bucket')

    if (isBucketMissing) {
      try {
        await ensureBucket(db, BUCKET)
      } catch (createErr) {
        const msg = createErr instanceof Error ? createErr.message : 'Errore creazione bucket'
        return NextResponse.json(
          {
            error: `${msg}. Vai su Supabase → Storage → New Bucket → "product-images" (Public).`,
            hint: 'bucket_missing',
          },
          { status: 500 }
        )
      }

      // Retry dopo aver creato il bucket
      const retry = await db.storage.from(BUCKET).upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })
      uploadError = retry.error
    }
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = db.storage.from(BUCKET).getPublicUrl(filename)

  return NextResponse.json({ url: data.publicUrl })
}
