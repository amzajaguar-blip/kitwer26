/**
 * @module AdminImportStreamRoute
 * @description POST /api/admin/import/stream
 * Esegue kitwer-tools.ts e streamma l'output reale via SSE.
 * Auth: kitwer_vault_session cookie o x-admin-secret header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spawn } from 'child_process';
import path from 'path';
import { z } from 'zod';

export const runtime = 'nodejs';

const CommandSchema = z.object({
  command: z.string().min(1).max(500),
});

/**
 * Comandi base consentiti (exact match o prefix per hard-reset con file).
 */
const ALLOWED_BASE = new Set([
  'import',
  'import --find-links',
  'import --upsert',
  'import --upsert --permissive',
  'import --permissive',
  'import --from-revisione',
  'import --hard-reset --force',
  // Modalità NO-ASIN: import diretto senza scraping Amazon (100% affidabile)
  'import --no-asin',
  'import --no-asin --upsert',
  'import --no-asin --permissive',
  'import --no-asin --upsert --permissive',
  // ── Unified Importer (unified-importer.ts) ──────────────────────
  'unified --dry-run',
  'unified --no-asin',
  'unified --no-asin --upsert',
  'unified --upsert',
  'unified --permissive',
  'unified --no-asin --upsert --permissive',
  'unified --hard-reset --force',
  'unified --enrich-images',
  'unified --remove-no-image',
  'unified --remove-duplicates',
]);

/**
 * Regex per hard-reset con file MAGAZZINO specifici (solo kitwer-tools).
 * Accetta: import --hard-reset --force MAGAZZINO/file.csv ...
 * Nota: i comandi "unified --hard-reset --force" sono coperti da ALLOWED_BASE (nessun
 * file-suffix dinamico — FilteredImportSection non costruisce comandi "unified" con file).
 */
const HARD_RESET_FILES_REGEX =
  /^import --hard-reset --force( MAGAZZINO\/[\w\-.]+\.(?:csv|CSV))+$/;

function isCommandAllowed(cmd: string): boolean {
  return ALLOWED_BASE.has(cmd) || HARD_RESET_FILES_REGEX.test(cmd);
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) return false;
  if (req.headers.get('x-admin-secret') === secret) return true;
  const cookieStore = await cookies();
  return cookieStore.get('kitwer_vault_session')?.value === secret;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[mGKHF]/g, '');
}

function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Converte una stringa comando UI negli argomenti da passare allo script CLI.
 *
 * - kitwer-tools.ts: riceve l'intero comando come args, es. ["import","--upsert"]
 *   command es: "import --hard-reset --force MAGAZZINO/file.csv"
 *
 * - unified-importer.ts: il prefisso "unified" viene già rimosso da runImportProcess
 *   prima di chiamare buildToolArgs, quindi riceve solo le flag, es. ["--no-asin"]
 *   command es: "--no-asin --upsert" (dopo strip del prefisso "unified ")
 */
function buildToolArgs(command: string): string[] {
  return command.trim().split(/\s+/);
}

/**
 * Spawna un processo, bufferizza stdout/stderr e li streamma via SSE.
 * Ritorna l'exit code (0 = successo).
 */
async function spawnAndStream(
  execArgs: string[],
  send: (event: string, data: unknown) => void
): Promise<number> {
  const handleLine = (line: string, isErr = false): void => {
    const clean = stripAnsi(line).trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    const type =
      lower.includes('[fatal]') || lower.includes('error') || lower.includes('✗') ? 'error' :
      lower.includes('[ok]') || lower.includes('✓') || lower.includes('success')  ? 'success' :
      lower.includes('[warn]') || lower.includes('warning')                        ? 'warn' :
      isErr ? 'warn' : 'info';
    send(type, { message: clean });
  };

  let proc: ReturnType<typeof spawn>;
  try {
    proc = spawn(execArgs[0], execArgs.slice(1), {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (spawnErr) {
    send('error', { message: `Impossibile avviare il processo: ${String(spawnErr)}` });
    return 1;
  }

  let stdoutBuf = '';
  let stderrBuf = '';

  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString('utf8');
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop() ?? '';
    lines.forEach(l => handleLine(l, false));
  });

  proc.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString('utf8');
    const lines = stderrBuf.split('\n');
    stderrBuf = lines.pop() ?? '';
    lines.forEach(l => handleLine(l, true));
  });

  return new Promise<number>((resolve) => {
    proc.on('close', (code: number | null) => {
      if (stdoutBuf.trim()) handleLine(stdoutBuf, false);
      if (stderrBuf.trim()) handleLine(stderrBuf, true);
      resolve(code ?? 1);
    });
    proc.on('error', (err: Error) => {
      send('error', { message: `Errore processo: ${err.message}` });
      resolve(1);
    });
  });
}

async function runImportProcess(
  command: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): Promise<void> {
  const encoder = new TextEncoder();
  const send = (event: string, data: unknown): void => {
    try {
      controller.enqueue(encoder.encode(encodeSSE(event, data)));
    } catch { /* stream già chiuso */ }
  };

  const isUnified   = command.startsWith('unified');
  const isFindLinks = command === 'import --find-links';
  const importArgs  = buildToolArgs(
    isFindLinks ? 'import' :
    isUnified   ? command.replace(/^unified\s*/, '') :
    command
  );

  send('start', { command, timestamp: new Date().toISOString() });

  // ── Step 1: Ricerca link Amazon (riempie URL nei CSV prima dell'import) ──
  if (isFindLinks) {
    send('info', { message: '── Step 1/2: Ricerca link Amazon per prodotti senza URL...' });
    const linksCode = await spawnAndStream(
      ['node', 'scripts/find-amazon-links.mjs'],
      send
    );
    if (linksCode !== 0) {
      send('warn', { message: `Ricerca link terminata con errori (codice ${linksCode}) — import continua comunque.` });
    }
    send('info', { message: '── Step 2/2: Import prodotti nuovi...' });
  }

  // ── Step 2: Import ────────────────────────────────────────────────────────
  const script = isUnified ? 'scripts/unified-importer.ts' : 'scripts/kitwer-tools.ts';
  const importCode = await spawnAndStream(
    ['npx', 'tsx', script, ...importArgs],
    send
  );

  // ── Risultato finale ────────────────────────────────────────────
  if (importCode === 0) {
    send('done', { message: 'Operazione completata con successo.', timestamp: new Date().toISOString() });
  } else {
    send('error', { message: `Processo terminato con codice ${importCode}.` });
    send('done',  { message: 'Import terminato con errori.', timestamp: new Date().toISOString() });
  }

  try { controller.close(); } catch { /* già chiuso */ }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type deve essere application/json' }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON non valido' }, { status: 400 }); }

  const parsed = CommandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validazione fallita', issues: parsed.error.issues }, { status: 422 });
  }

  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const command = parsed.data.command.trim();
  if (!isCommandAllowed(command)) {
    return NextResponse.json({ error: `Comando non consentito: "${command}"` }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await runImportProcess(command, controller);
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
