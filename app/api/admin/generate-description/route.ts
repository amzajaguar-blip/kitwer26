import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.name || !body?.category) {
    return NextResponse.json(
      { error: 'name e category sono obbligatori' },
      { status: 400 }
    );
  }

  const { name, category } = body as { name: string; category: string };

  const userPrompt =
    `Sei un copywriter esperto in prodotti High-Ticket e di lusso. ` +
    `Scrivi una descrizione persuasiva per questo prodotto: ${name} della categoria ${category}. ` +
    `Usa un tono esclusivo, evidenzia il valore premium. ` +
    `Formatta la risposta in HTML di base (usa <br>, <strong>, <ul>, <li> per i punti chiave) ` +
    `così è pronta per il web. ` +
    `Non aggiungere convenevoli, restituisci solo il codice HTML della descrizione.`;

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 600,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[generate-description] DeepSeek error:', err);
    return NextResponse.json({ error: 'Errore DeepSeek API' }, { status: 502 });
  }

  const data = await res.json();
  const description: string = data.choices?.[0]?.message?.content ?? '';

  return NextResponse.json({ description });
}
