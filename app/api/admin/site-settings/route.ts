import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

const DEFAULTS = {
  id: 1,
  logo_url: '',
  hero_title: 'Il Setup dei Tuoi Sogni',
  hero_subtitle: 'Periferiche premium per veri gamer. Confrontiamo i migliori prezzi su mouse, monitor, tastiere e tutto il gear che ti serve.',
  updated_at: new Date().toISOString(),
}

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single()

    // Tabella non ancora creata → restituisce i default senza errore
    if (error) return NextResponse.json({ settings: DEFAULTS })
    return NextResponse.json({ settings: data ?? DEFAULTS })
  } catch {
    return NextResponse.json({ settings: DEFAULTS })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { logo_url, hero_title, hero_subtitle } = await request.json()

    if (hero_title !== undefined && hero_title.length > 80) {
      return NextResponse.json({ error: 'hero_title troppo lungo (max 80 caratteri)' }, { status: 400 })
    }

    const db = getServiceClient()
    const { data, error } = await db
      .from('site_settings')
      .upsert({
        id: 1,
        logo_url: logo_url ?? '',
        hero_title: hero_title ?? '',
        hero_subtitle: hero_subtitle ?? '',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Invalida la cache di Next.js → le modifiche appaiono subito
    revalidatePath('/', 'page')

    return NextResponse.json({ settings: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
