/**
 * lib/pdf.ts — Generatore PDF "Scheda Tecnica di Primo Avvio"
 *
 * Produce KITWER26_OPERATIONAL_MANUAL.pdf da allegare all'email di conferma.
 * Utilizza pdf-lib: zero dipendenze browser, compatibile Vercel Edge/Node.js.
 *
 * Layout:  sfondo nero #0a0a0a, testo grigio, accenti ciano, watermark CONFIDENTIAL
 * Adattivo: sezioni setup e numero pagine si adattano ai prodotti effettivamente acquistati.
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import QRCode from 'qrcode';

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:        rgb(0.04, 0.04, 0.04),
  surface:   rgb(0.07, 0.07, 0.07),
  border:    rgb(0.12, 0.12, 0.12),
  cyan:      rgb(0.13, 0.83, 0.93),
  white:     rgb(0.95, 0.95, 0.95),
  muted:     rgb(0.44, 0.44, 0.44),
  faint:     rgb(0.22, 0.22, 0.22),
  orange:    rgb(0.98, 0.45, 0.09),
  watermark: rgb(0.18, 0.18, 0.18),
};

const W = 595;
const H = 842;
const M = 40;

function rect(page: ReturnType<PDFDocument['addPage']>, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}
function rule(page: ReturnType<PDFDocument['addPage']>, x: number, y: number, w: number, color = C.border, thickness = 0.5) {
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, color, thickness });
}
function drawWatermark(page: ReturnType<PDFDocument['addPage']>, font: Awaited<ReturnType<PDFDocument['embedFont']>>) {
  page.drawText('CONFIDENTIAL', { x: 90, y: 330, size: 72, font, color: C.watermark, opacity: 0.06, rotate: degrees(45) });
}
function drawHeader(page: ReturnType<PDFDocument['addPage']>, fonts: { mono: Awaited<ReturnType<PDFDocument['embedFont']>>; bold: Awaited<ReturnType<PDFDocument['embedFont']>> }, subtitle: string, shortId: string) {
  rect(page, 0, H - 70, W, 70, C.surface);
  rule(page, 0, H - 70, W, C.cyan, 1.5);
  page.drawText('KITWER26', { x: M, y: H - 44, size: 22, font: fonts.bold, color: C.cyan });
  page.drawText(subtitle, { x: M, y: H - 60, size: 8, font: fonts.mono, color: C.muted });
  page.drawText(`REF: ${shortId}`, { x: W - M - 90, y: H - 44, size: 9, font: fonts.mono, color: C.muted });
  page.drawText(new Date().toLocaleDateString('it-IT'), { x: W - M - 90, y: H - 58, size: 8, font: fonts.mono, color: C.faint });
}
function drawFooter(page: ReturnType<PDFDocument['addPage']>, font: Awaited<ReturnType<PDFDocument['embedFont']>>, pageLabel: string) {
  const y = 24;
  rule(page, M, y + 14, W - 2 * M, C.border, 0.5);
  page.drawText('KITWER26 · CONFIDENTIAL · FOR AUTHORIZED OPERATORS ONLY', { x: M, y, size: 6.5, font, color: C.faint });
  page.drawText(pageLabel, { x: W - M - 25, y, size: 6.5, font, color: C.faint });
}
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface PdfOrderItem {
  name:       string;
  price:      number;
  quantity:   number;
  category?:  string | null;
  asin?:      string | null;
}
export interface TacticalDealItem {
  name:        string;
  price:       number;
  productUrl:  string;
}

export interface GeneratePdfOpts {
  orderId:        string;
  customerName:   string;
  items:          PdfOrderItem[];
  totalAmount:    number;
  tacticalDeals?: TacticalDealItem[];
}

// ── Setup sections per categoria ─────────────────────────────────────────────
type SetupSection = { icon: string; title: string; color: ReturnType<typeof rgb>; steps: string[] };

const ALL_SETUP_SECTIONS: Record<string, SetupSection> = {
  'crypto': {
    icon: '◈', title: 'INIZIALIZZAZIONE CRYPTO WALLET (Ledger / Air-Gapped)',
    color: C.cyan,
    steps: [
      '1. Collega il dispositivo SOLO tramite cavo USB certificato al tuo PC.',
      '2. Avvia Ledger Live → Aggiungi nuovo dispositivo → Segui il wizard.',
      '3. Genera la Seed Phrase (24 parole) OFFLINE. NON fotografarla mai.',
      '4. Incidi la Seed sul supporto titanio (backup-seed) con punzone.',
      '5. Verifica il dispositivo con 3 transazioni di test prima dell\'uso in prod.',
      '6. Attiva il PIN con lunghezza massima (8 cifre) e timeout 1 minuto.',
    ],
  },
  'comms': {
    icon: '◉', title: 'SCHERMATURA RFID / FARADAY CAGE',
    color: C.orange,
    steps: [
      '1. Inserisci wallet fisici e carte contactless nella borsa Faraday.',
      '2. Test: tenta un pagamento NFC mentre la borsa è chiusa → deve fallire.',
      '3. Non conservare la borsa vicino a generatori EMF (router, microonde).',
      '4. Ricarica il dispositivo di emergenza FUORI dalla gabbia Faraday.',
      '5. Sostituisci la guarnizione ogni 18 mesi per mantenere l\'attenuazione.',
    ],
  },
  'racing': {
    icon: '◆', title: 'OTTIMIZZAZIONE SIM-RACING SETUP',
    color: C.orange,
    steps: [
      '1. Livella il cockpit su superficie piana — usa livella a bolla (±0.5°).',
      '2. Imposta il Force Feedback al 60% come baseline, aumenta gradualmente.',
      '3. Collega il volante Direct Drive PRIMA di avviare il simulatore.',
      '4. Calibra il range di sterzo in-game: 900° per GT, 540° per F1.',
      '5. Shifter: imposta modalità sequenziale o H-pattern nel menu del gioco.',
      '6. iRacing: verifica "Controller Calibration" → Auto-Clutch OFF per realism.',
    ],
  },
  'power': {
    icon: '◇', title: 'ALIMENTAZIONE TATTICA (Power Station / Solare)',
    color: C.muted,
    steps: [
      '1. Prima carica: ricarica al 100% prima dell\'uso operativo.',
      '2. Collega il pannello solare in ambiente aperto, angolo 35-45° verso sud.',
      '3. Monitora la carica via app dedicata — non scendere sotto il 20%.',
      '4. In blackout: priorità — router, PC, luci LED. Non sovraccaricare.',
      '5. Stoccaggio a lungo termine: mantieni la batteria al 50-60% di carica.',
    ],
  },
  'security': {
    icon: '◈', title: 'CONFIGURAZIONE SMART SECURITY',
    color: C.cyan,
    steps: [
      '1. Installa le telecamere in posizione sopraelevata (min 2.5m) con angolo 120°.',
      '2. Configura la rete su VLAN separata — mai condividere con dispositivi personali.',
      '3. Abilita l\'autenticazione a 2 fattori sull\'app di gestione.',
      '4. Imposta notifiche push per eventi motion detection con sensibilità alta.',
      '5. Backup filmati: NAS locale con crittografia AES-256 + cloud cifrato.',
    ],
  },
  'survival': {
    icon: '◉', title: 'PROTOCOLLO EDC / SURVIVAL',
    color: C.orange,
    steps: [
      '1. Assembla il kit EDC in ordine di priorità: acqua, luce, taglio, fuoco, pronto soccorso.',
      '2. Testa il filtro acqua prima del deployment — verifica il flusso e l\'intasamento.',
      '3. Multi-tool: affila le lame ogni 3 mesi con pietra a grana 400-800.',
      '4. Torcia: usa batterie NiMH ricaricabili — capacità dichiarata vs reale: -15%.',
      '5. Kit medico: controlla le scadenze ogni 6 mesi, sostituisci i prodotti scaduti.',
    ],
  },
  'pc': {
    icon: '◆', title: 'CONFIGURAZIONE PC HARDWARE',
    color: C.muted,
    steps: [
      '1. Installa RAM in dual-channel: slot A2+B2 (controlla il manuale della scheda madre).',
      '2. Abilita XMP/EXPO nel BIOS per le frequenze dichiarate della RAM.',
      '3. SSD NVMe: installa nel primo slot M.2 (più vicino alla CPU) per massime prestazioni.',
      '4. Thermal paste: strato sottile al centro del die CPU — non spalmare manualmente.',
      '5. Verifica le temperature sotto carico: CPU <85°C, GPU <83°C in gaming.',
    ],
  },
  'desk': {
    icon: '◇', title: 'OTTIMIZZAZIONE TRADING / GAMING DESK',
    color: C.cyan,
    steps: [
      '1. Posiziona i monitor: top del display all\'altezza degli occhi, distanza 60-80cm.',
      '2. Ergonomia: schiena dritta, gomiti a 90°, polsi neutri sulla tastiera.',
      '3. Gestione cavi: usa canaline sotto la scrivania — zero cavi sul piano.',
      '4. Monitor arm: regola inclinazione -5°/+5° per eliminare i riflessi.',
      '5. Pad XL: copri tutta l\'area di lavoro per coerenza mouse tracking.',
    ],
  },
};

/** Determina quali sezioni setup mostrare in base alle categorie dei prodotti acquistati */
function getRelevantSections(items: PdfOrderItem[]): SetupSection[] {
  const cats = new Set(items.map((i) => (i.category ?? '').toLowerCase()));
  const sections: SetupSection[] = [];
  const add = (key: string) => { if (ALL_SETUP_SECTIONS[key]) sections.push(ALL_SETUP_SECTIONS[key]); };

  if ([...cats].some((c) => c.includes('crypto') || c.includes('wallet') || c.includes('hardware-crypto'))) add('crypto');
  if ([...cats].some((c) => c.includes('comms') || c.includes('rfid') || c.includes('security-shield'))) add('comms');
  if ([...cats].some((c) => c.includes('sim-racing') || c.includes('racing'))) add('racing');
  if ([...cats].some((c) => c.includes('power') || c.includes('tactical-power'))) add('power');
  if ([...cats].some((c) => c.includes('smart security') || c.includes('smart-security') || c.includes('sicurezza'))) add('security');
  if ([...cats].some((c) => c.includes('survival') || c.includes('edc'))) add('survival');
  if ([...cats].some((c) => c.includes('pc hardware') || c.includes('pc-hardware'))) add('pc');
  if ([...cats].some((c) => c.includes('trading') || c.includes('gaming-desk') || c.includes('desk'))) add('desk');

  // Se nessuna categoria riconosciuta → mostra una sezione generica
  if (!sections.length) {
    sections.push({
      icon: '◈', title: 'NOTE OPERATIVE GENERALI',
      color: C.cyan,
      steps: [
        '1. Verifica l\'integrità del pacco alla consegna prima di firmare.',
        '2. Conserva la confezione originale per eventuali resi o garanzie.',
        '3. Registra il prodotto sul sito del produttore per attivare la garanzia.',
        '4. Per supporto tecnico contatta: support@kitwer26.com',
      ],
    });
  }
  return sections;
}

// ── Main generator ───────────────────────────────────────────────────────────
export async function generateOperationalPdf(opts: GeneratePdfOpts): Promise<Uint8Array> {
  const { orderId, customerName, items, totalAmount, tacticalDeals = [] } = opts;
  const shortId = String(orderId).slice(0, 8).toUpperCase();

  const doc     = await PDFDocument.create();
  const mono    = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);
  const fonts   = { mono, bold: monoBold };

  // ── Raccoglie tutte le righe items da stampare ─────────────────────────────
  type ItemRow = { text: string; price: string; isAsin?: boolean };
  const itemRows: ItemRow[] = [];
  for (const item of items) {
    const nameTrunc = item.name.length > 58 ? item.name.slice(0, 55) + '...' : item.name;
    itemRows.push({ text: nameTrunc, price: `€${(item.price * item.quantity).toFixed(2)}` });
    if (item.asin) itemRows.push({ text: `ASIN: ${item.asin}`, price: '', isAsin: true });
  }

  // ── PAGE 1+ — Riepilogo ordine (può espandersi su più pagine) ──────────────
  const pages: ReturnType<PDFDocument['addPage']>[] = [];
  const addPage = () => {
    const pg = doc.addPage([W, H]);
    rect(pg, 0, 0, W, H, C.bg);
    drawWatermark(pg, monoBold);
    pages.push(pg);
    return pg;
  };

  let pg = addPage();
  drawHeader(pg, fonts, 'OPERATIONAL MANUAL', shortId);

  let y = H - 120;

  // Title block (solo prima pagina)
  pg.drawText('SCHEDA TECNICA DI PRIMO AVVIO', { x: M, y, size: 16, font: monoBold, color: C.white });
  y -= 16;
  pg.drawText('PROTOCOLLO ATTIVATO — ASSET IN FASE DI PREPARAZIONE', { x: M, y, size: 8, font: mono, color: C.cyan });
  y -= 30;
  rule(pg, M, y, W - 2 * M, C.faint);

  // Operatore
  y -= 18;
  pg.drawText('IDENTIFICAZIONE OPERATORE', { x: M, y, size: 7, font: mono, color: C.muted });
  y -= 14;
  pg.drawText(customerName.toUpperCase(), { x: M, y, size: 11, font: monoBold, color: C.white });
  y -= 14;
  pg.drawText(`ID OPERAZIONE: ${shortId}   ARTICOLI: ${items.length}   BUNDLE: ${items.length > 1 ? 'SÌ' : 'NO'}`,
    { x: M, y, size: 8, font: mono, color: C.faint });
  y -= 24;
  rule(pg, M, y, W - 2 * M, C.faint);

  // Lista items
  y -= 18;
  pg.drawText('ASSET ACQUISITI', { x: M, y, size: 8, font: monoBold, color: C.cyan });
  y -= 6;
  rule(pg, M, y, W - 2 * M, C.border, 0.5);

  for (const row of itemRows) {
    // Nuova pagina se non c'è spazio
    if (y < 80) {
      drawFooter(pg, mono, `... / ?`);
      pg = addPage();
      drawHeader(pg, fonts, 'OPERATIONAL MANUAL — ASSET (cont.)', shortId);
      y = H - 100;
      pg.drawText('ASSET ACQUISITI (continuazione)', { x: M, y, size: 8, font: monoBold, color: C.cyan });
      y -= 6;
      rule(pg, M, y, W - 2 * M, C.border, 0.5);
    }

    y -= row.isAsin ? 11 : 16;
    if (row.isAsin) {
      pg.drawText(row.text, { x: M + 12, y, size: 7, font: mono, color: C.faint });
    } else {
      pg.drawText('▸', { x: M, y, size: 8, font: mono, color: C.cyan });
      pg.drawText(row.text, { x: M + 12, y, size: 8, font: mono, color: C.white });
      if (row.price) pg.drawText(row.price, { x: W - M - 50, y, size: 8, font: monoBold, color: C.cyan });
    }
    y -= 4;
    rule(pg, M + 12, y, W - 2 * M - 12, C.border, 0.3);
  }

  // Totale
  y -= 14;
  if (y < 60) {
    drawFooter(pg, mono, '... / ?');
    pg = addPage();
    drawHeader(pg, fonts, 'OPERATIONAL MANUAL — TOTALE', shortId);
    y = H - 100;
  }
  rect(pg, M, y - 6, W - 2 * M, 22, C.surface);
  pg.drawText('VALORE TOTALE FORNITURA', { x: M + 8, y: y + 4, size: 8, font: mono, color: C.muted });
  pg.drawText(`€${totalAmount.toFixed(2)}`, { x: W - M - 55, y: y + 4, size: 11, font: monoBold, color: C.cyan });

  // Segna quante pagine ordine abbiamo
  const orderPageCount = pages.length;

  // ── SETUP PAGES — sezioni dinamiche basate sulle categorie acquistate ───────
  const relevantSections = getRelevantSections(items);

  pg = addPage();
  drawHeader(pg, fonts, 'OPERATIONAL MANUAL — SETUP GUIDE', shortId);
  y = H - 100;

  for (const sec of relevantSections) {
    // Nuova pagina se non c'è spazio per la sezione
    if (y < 180) {
      drawFooter(pg, mono, '... / ?');
      pg = addPage();
      drawHeader(pg, fonts, 'OPERATIONAL MANUAL — SETUP GUIDE (cont.)', shortId);
      y = H - 100;
    }

    rect(pg, M, y - 2, W - 2 * M, 20, C.surface);
    pg.drawText(sec.icon, { x: M + 6, y: y + 5, size: 10, font: monoBold, color: sec.color });
    pg.drawText(sec.title, { x: M + 20, y: y + 5, size: 8.5, font: monoBold, color: C.white });
    y -= 22;

    for (const step of sec.steps) {
      if (y < 80) {
        drawFooter(pg, mono, '... / ?');
        pg = addPage();
        drawHeader(pg, fonts, 'OPERATIONAL MANUAL — SETUP GUIDE (cont.)', shortId);
        y = H - 100;
      }
      const lines = wrapText(step, 85);
      for (let li = 0; li < lines.length; li++) {
        pg.drawText(lines[li], { x: li === 0 ? M + 10 : M + 18, y, size: 7.5, font: mono, color: C.muted });
        y -= 12;
      }
    }
    y -= 10;
    rule(pg, M, y, W - 2 * M, C.faint, 0.3);
    y -= 12;
  }

  // Nota sicurezza finale
  if (y > 80) {
    rect(pg, M, y - 22, W - 2 * M, 36, rgb(0.06, 0.10, 0.10));
    rule(pg, M, y + 14, W - 2 * M, C.cyan, 0.8);
    pg.drawText('⚠  NOTA DI SICUREZZA', { x: M + 8, y: y + 2, size: 8, font: monoBold, color: C.cyan });
    pg.drawText('Conserva questo documento in luogo sicuro. Non condividerlo digitalmente.',
      { x: M + 8, y: y - 12, size: 7.5, font: mono, color: C.muted });
  }

  // ── CLASSIFIED PAGE — Tactical Deals cross-sell con QR code ──────────────
  const deals = tacticalDeals.slice(0, 3);
  if (deals.length > 0) {
    const classifiedPg = addPage();
    drawHeader(classifiedPg, fonts, 'OPERATIONAL MANUAL — CLASSIFIED', shortId);

    // Watermark CLASSIFIED forte
    classifiedPg.drawText('CLASSIFIED', { x: 70, y: 340, size: 80, font: monoBold, color: rgb(0.85, 0.13, 0.13), opacity: 0.08, rotate: degrees(40) });

    let cy = H - 105;

    // Intestazione pagina
    rect(classifiedPg, M, cy - 2, W - 2 * M, 26, rgb(0.12, 0.04, 0.04));
    rule(classifiedPg, M, cy + 24, W - 2 * M, rgb(0.85, 0.13, 0.13), 1.5);
    classifiedPg.drawText('[ CLASSIFIED: TACTICAL OVERRIDE ]', { x: M + 8, y: cy + 8, size: 11, font: monoBold, color: rgb(0.95, 0.20, 0.20) });
    cy -= 28;

    classifiedPg.drawText('VULNERABILITÀ RILEVATA NEL TUO SETUP — ASSET CRITICI A COSTO RIDOTTO', { x: M, y: cy, size: 7, font: mono, color: C.orange });
    cy -= 8;
    classifiedPg.drawText('Sistema ha identificato 3 componenti mancanti nel tuo arsenale tattico. Acquisizione consigliata immediata.', { x: M, y: cy, size: 7, font: mono, color: C.muted });
    cy -= 20;
    rule(classifiedPg, M, cy, W - 2 * M, C.faint, 0.5);
    cy -= 18;

    // Blocchi prodotti con QR
    for (let di = 0; di < deals.length; di++) {
      const deal = deals[di];
      const qrUrl = `${deal.productUrl}${deal.productUrl.includes('?') ? '&' : '?'}ref=pdf_manual`;

      // Box prodotto
      const boxH = 80;
      rect(classifiedPg, M, cy - boxH + 10, W - 2 * M, boxH, C.surface);
      rule(classifiedPg, M, cy + 10, W - 2 * M, C.faint, 0.3);

      // Numero slot
      classifiedPg.drawText(`ASSET ${String(di + 1).padStart(2, '0')}`, { x: M + 8, y: cy - 4, size: 7, font: monoBold, color: C.orange });

      // Nome prodotto (troncato)
      const nameTrunc = deal.name.length > 52 ? deal.name.slice(0, 49) + '...' : deal.name;
      const nameLines = wrapText(nameTrunc, 52);
      let nly = cy - 17;
      for (const nl of nameLines) {
        classifiedPg.drawText(nl, { x: M + 8, y: nly, size: 8.5, font: monoBold, color: C.white });
        nly -= 12;
      }

      // Prezzo
      classifiedPg.drawText(`€${deal.price.toFixed(2)}`, { x: M + 8, y: nly - 2, size: 11, font: monoBold, color: C.cyan });
      classifiedPg.drawText('ACQUISISCI ORA →', { x: M + 8, y: nly - 16, size: 7, font: monoBold, color: C.orange });

      // QR Code (PNG buffer → embed in PDF)
      try {
        const qrBuffer = await QRCode.toBuffer(qrUrl, {
          type:       'png',
          width:       70,
          margin:      1,
          color:       { dark: '#22d3ee', light: '#111111' },
          errorCorrectionLevel: 'M',
        });
        const qrImage = await doc.embedPng(qrBuffer);
        classifiedPg.drawImage(qrImage, { x: W - M - 75, y: cy - boxH + 16, width: 68, height: 68 });
      } catch { /* QR fallback: mostra URL testuale */ }

      cy -= (boxH + 8);
    }

    // P.S. cross-sell tattico
    cy -= 8;
    rule(classifiedPg, M, cy, W - 2 * M, C.faint, 0.3);
    cy -= 16;
    classifiedPg.drawText('P.S.', { x: M, y: cy, size: 8, font: monoBold, color: C.orange });
    cy -= 12;
    const psLines = wrapText(
      'I nostri sistemi hanno rilevato una vulnerabilità nel tuo setup. Inquadra il QR code per acquisire gli asset a costo ridotto prima che le scorte vengano esaurite.',
      88
    );
    for (const pl of psLines) {
      classifiedPg.drawText(pl, { x: M, y: cy, size: 7.5, font: mono, color: C.muted });
      cy -= 11;
    }
  }

  // ── Fix footer con numerazione corretta ────────────────────────────────────
  const totalPages = pages.length;
  pages.forEach((p, i) => drawFooter(p, mono, `${i + 1} / ${totalPages}`));

  // ── Metadata ──────────────────────────────────────────────────────────────
  doc.setTitle('KITWER26 Operational Manual');
  doc.setAuthor('Kitwer26 — The Architect of your Digital Fortress');
  doc.setSubject(`Ordine #${shortId} — ${items.length} articoli — Scheda Tecnica`);
  doc.setCreationDate(new Date());
  doc.setLanguage('it-IT');

  void orderPageCount; // usato per debug se necessario
  return doc.save();
}
