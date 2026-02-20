import { NextRequest, NextResponse } from 'next/server'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

const SYSTEM_PROMPT = `Sei un copywriter esperto di gaming hardware e streaming gear.
Il tuo target è "Sara", 28 anni, gamer casual e streamer emergente. Vuole prodotti fighi, affidabili e con un buon rapporto qualità/prezzo.

Dato un testo grezzo con specifiche tecniche di un prodotto, genera un JSON con:
- "title": nome prodotto completo e accattivante (max 80 char)
- "slug": versione URL-safe del titolo (lowercase, trattini, no caratteri speciali)
- "description": descrizione coinvolgente per Sara (150-250 parole). Parla dei benefici reali, non solo specs. Usa un tono entusiasta ma credibile.
- "category": una tra: Mouse, Tastiera, Monitor, Monitor 144hz, Cuffie, Microfono, Webcam, Stream Deck, GPU, Sedia Gaming, Mousepad, Controller, Cattura Video, Illuminazione
- "specs": oggetto JSON con le specifiche tecniche chiave (usa snake_case per le chiavi, es: refresh_rate, weight_g, dpi, switch_type, panel_type, connectivity, battery_life, vram, ecc.)
- "price_current": prezzo stimato in EUR (numero)
- "price_original": prezzo di listino originale in EUR se scontato, altrimenti null
- "meta_title": titolo SEO ottimizzato (max 60 char)
- "meta_description": meta description SEO (max 155 char)

Rispondi SOLO con il JSON valido, senza markdown, senza backtick, senza spiegazioni.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY non configurata' }, { status: 500 })
  }

  try {
    const { rawText } = await request.json()

    if (!rawText || rawText.trim().length < 10) {
      return NextResponse.json({ error: 'Testo troppo corto. Incolla le specifiche del prodotto.' }, { status: 400 })
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: rawText },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `DeepSeek API error: ${response.status}`, details: err }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: 'Risposta vuota da DeepSeek' }, { status: 502 })
    }

    // Prova a parsare il JSON (rimuovi eventuale markdown wrapper)
    const cleanJson = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '')
    const product = JSON.parse(cleanJson)

    return NextResponse.json({ product })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
