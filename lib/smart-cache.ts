import { getServiceClient } from '@/lib/supabase'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 ore

interface CacheResult<T> {
  data: T
  fromCache: boolean
  cachedAt: string
}

/**
 * Smart Cache - "Postgres as Redis"
 *
 * Strategia:
 * 1. Controlla se esiste un record in product_cache per questo product_id + source
 * 2. Se esiste ed è < 24h → ritorna il cached JSON
 * 3. Se non esiste o è scaduto → chiama fetchFn, salva in DB, ritorna dati freschi
 *
 * MAI chiamare API esterne in tempo reale durante la visita dell'utente.
 * Questa funzione viene usata SOLO nei server components / ISR revalidation.
 */
export async function getCachedData<T>(
  productId: string,
  source: string,
  fetchFn: () => Promise<T>
): Promise<CacheResult<T>> {
  const db = getServiceClient()

  // 1. Cerca cache esistente
  const { data: cached } = await db
    .from('product_cache')
    .select('*')
    .eq('product_id', productId)
    .eq('source', source)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  // 2. Cache hit? Controlla TTL
  if (cached && !isCacheExpired(cached)) {
    return {
      data: cached.external_api_response as T,
      fromCache: true,
      cachedAt: cached.updated_at,
    }
  }

  // 3. Cache miss o scaduta → fetch dati freschi
  const freshData = await fetchFn()

  // 4. Upsert nel cache
  if (cached) {
    await db
      .from('product_cache')
      .update({
        external_api_response: freshData as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cached.id)
  } else {
    await db
      .from('product_cache')
      .insert({
        product_id: productId,
        source,
        external_api_response: freshData as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
  }

  return {
    data: freshData,
    fromCache: false,
    cachedAt: new Date().toISOString(),
  }
}

function isCacheExpired(cache: { updated_at: string }): boolean {
  const updatedAt = new Date(cache.updated_at).getTime()
  return Date.now() - updatedAt > CACHE_TTL_MS
}

/**
 * Invalida la cache per un prodotto specifico.
 * Utile quando si aggiornano prezzi manualmente.
 */
export async function invalidateCache(productId: string, source?: string) {
  const db = getServiceClient()
  let query = db.from('product_cache').delete().eq('product_id', productId)
  if (source) {
    query = query.eq('source', source)
  }
  await query
}

/**
 * Pulisce tutte le cache scadute (> 24h).
 * Da chiamare periodicamente via cron o Vercel Cron.
 */
export async function cleanExpiredCache() {
  const db = getServiceClient()
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString()
  await db
    .from('product_cache')
    .delete()
    .lt('updated_at', cutoff)

}
