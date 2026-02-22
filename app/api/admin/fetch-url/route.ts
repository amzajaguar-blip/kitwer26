import { NextRequest, NextResponse } from 'next/server'

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)
}

function extractOgImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1] && match[1].startsWith('http')) return match[1]
  }
  return null
}

function extractTitle(html: string): string | null {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
  if (ogTitle?.[1]) return ogTitle[1]
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return title?.[1]?.trim() ?? null
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'URL non valido. Deve iniziare con http/https.' }, { status: 400 })
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Impossibile accedere all'URL (${response.status})` }, { status: 502 })
    }

    const html = await response.text()
    const text = stripHtml(html)
    const imageUrl = extractOgImage(html)
    const title = extractTitle(html)

    if (text.length < 50) {
      return NextResponse.json({ error: 'Pagina troppo corta o non accessibile (potrebbe essere JS-rendered)' }, { status: 422 })
    }

    return NextResponse.json({ text, imageUrl, title })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    if (message.includes('timeout') || message.includes('abort')) {
      return NextResponse.json({ error: 'Timeout: la pagina ha impiegato troppo a rispondere' }, { status: 504 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
