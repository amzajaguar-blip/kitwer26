import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/generate-description
 * Body: { title: string, variantAttributes?: string }
 *
 * Genera una descrizione prodotto tramite DeepSeek e la restituisce.
 * Usare in un task di background (es. script Node.js) per popolare
 * il campo description su Supabase, non in real-time sul client.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.title) {
    return NextResponse.json({ error: 'title è obbligatorio' }, { status: 400 });
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY non configurata' }, { status: 500 });
  }

  const { title, variantAttributes } = body as {
    title: string;
    variantAttributes?: string;
  };

  const prompt = variantAttributes
    ? `Scrivi una descrizione prodotto per: "${title}" — variante: ${variantAttributes}`
    : `Scrivi una descrizione prodotto per: "${title}"`;

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deepseekKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'Sei un copywriter esperto in e-commerce tech. Scrivi descrizioni prodotto concise, tecniche e coinvolgenti in italiano per un pubblico tech-savvy. Massimo 120 parole. Solo testo puro, nessun markdown.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[DeepSeek]', err);
    return NextResponse.json({ error: 'Errore DeepSeek API' }, { status: 502 });
  }

  const data = await res.json();
  const description: string = data.choices?.[0]?.message?.content ?? '';

  return NextResponse.json({ description });
}
