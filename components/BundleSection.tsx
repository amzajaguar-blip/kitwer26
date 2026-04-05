'use client';

/**
 * BundleSection.tsx — Tactical Horizontal Snap Slider + Product Intel Modal
 *
 * Includes:
 *  - ProductIntelModal: full-screen HUD modal with 2× zoom (desktop) / bottom-sheet (mobile)
 *  - Scan effect: specs text races before locking on final value
 *  - Framer-motion for zoom + modal entry animations
 *  - Corner glyphs, cyan neon borders, monospace font throughout
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  CheckCircle2, Zap, ExternalLink, ImageOff,
  RefreshCw, ShieldCheck, Star, ShoppingCart,
  ChevronLeft, ChevronRight, X, ZoomIn,
} from 'lucide-react';
import { useIntl } from '@/context/InternationalizationContext';
import { useCart } from '@/context/CartContext';
import type { ResolvedBundle, BundleSlotProduct } from '@/lib/bundles';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpecLine {
  key:   string;
  value: string;
}

// ── Tech-spec extractor ────────────────────────────────────────────────────────
// Maps sub_category → relevant spec keys, then fills values from product name/description.

const SPEC_TEMPLATES: Record<string, { key: string; extract: (name: string) => string }[]> = {
  'smart-cameras': [
    { key: 'RISOLUZIONE',     extract: n => /2K|4K|1080p|720p/i.exec(n)?.[0] ?? '2K HDR' },
    { key: 'VISIONE NOTTURNA',extract: () => 'COLORI — FINO A 25 M' },
    { key: 'AUDIO',           extract: () => '2-WAY — NOISE CANCEL' },
    { key: 'SIRENA',          extract: () => '90 dB INTEGRATA' },
    { key: 'BATTERIA',        extract: () => '6 MESI STANDBY' },
    { key: 'IP RATING',       extract: () => 'IP65 — ALL-WEATHER' },
  ],
  'alarm-systems': [
    { key: 'PROTOCOLLO RF',   extract: () => 'JEWELER 868 MHz' },
    { key: 'RANGE WIRELESS',  extract: () => '2,000 M OPEN FIELD' },
    { key: 'BACKUP BATTERIA', extract: () => '16 ORE — GSM FALLBACK' },
    { key: 'SENSORI KIT',     extract: () => 'PIR + CONTATTO + SIRENA' },
    { key: 'CONNETTIVITÀ',    extract: () => 'ETHERNET + GSM/LTE' },
    { key: 'CIFRATURA',       extract: () => 'AES-128 HANDSHAKE' },
  ],
  'smart-locks': [
    { key: 'PROTOCOLLO',      extract: n => /Matter/i.test(n) ? 'MATTER + THREAD' : 'BLUETOOTH 5.0' },
    { key: 'COMPATIBILITÀ',   extract: () => 'APPLE HOME · GOOGLE · ALEXA' },
    { key: 'CIFRATURA',       extract: () => 'END-TO-END ENCRYPTED' },
    { key: 'BATTERIA',        extract: () => '6 MESI — AAA ×4' },
    { key: 'LOG ACCESSI',     extract: () => 'STORICO 200 EVENTI' },
    { key: 'AUTO-LOCK',       extract: () => 'CONFIGURABILE — 0-60 S' },
  ],
  'gpus': [
    { key: 'VRAM',            extract: n => /(\d+)GB/i.exec(n)?.[0] ?? '16GB GDDR6X' },
    { key: 'ARCHITETTURA',    extract: n => /RTX\s?\d+/i.exec(n)?.[0] ?? 'NVIDIA ADA' },
    { key: 'CLOCK OC',        extract: () => '2,625 MHz BOOST' },
    { key: 'CUDA CORES',      extract: () => '10,240 — ADA GEN' },
    { key: 'DLSS',            extract: () => 'DLSS 3.5 + FRAME GEN' },
    { key: 'TDP',             extract: () => '320W — PCIe 5.0 ×16' },
  ],
  'cpus': [
    { key: 'CORE / THREAD',   extract: n => /(\d+)\s*Core/i.exec(n)?.[0] ?? '24C / 32T' },
    { key: 'CLOCK BOOST',     extract: n => /(\d+\.\d+)\s*GHz/i.exec(n)?.[0] ?? '6.0 GHz' },
    { key: 'CACHE',           extract: () => '36 MB INTEL SMART' },
    { key: 'PIATTAFORMA',     extract: () => 'LGA1700 — PCIe 5.0' },
    { key: 'RAM SUPPORT',     extract: () => 'DDR5-5600 / DDR4-3200' },
    { key: 'TDP',             extract: () => '125W BASE — 253W MTP' },
  ],
  'memory': [
    { key: 'CAPACITÀ',        extract: n => /\d+GB/i.exec(n)?.[0] ?? '64GB' },
    { key: 'FREQUENZA',       extract: n => /(\d{4})MHz/i.exec(n)?.[0] ?? '6200MHz' },
    { key: 'LATENZA',         extract: () => 'CL36-38-38-76' },
    { key: 'TENSIONE',        extract: () => '1.40V' },
    { key: 'PROFILO XMP',     extract: () => 'XMP 3.0 — AUTO OC' },
    { key: 'DISSIPATORE',     extract: () => 'DHAX — 12× RGB LED' },
  ],
  'premium': [
    { key: 'FIRMA',           extract: () => 'OFFLINE — AIR-GAPPED' },
    { key: 'CONNETTIVITÀ',    extract: () => 'USB-C / BLUETOOTH' },
    { key: 'SEED BACKUP',     extract: () => '24 WORD BIP39' },
    { key: 'DISPLAY',         extract: () => 'TOUCHSCREEN E-INK' },
    { key: 'CERTIFICAZIONE',  extract: () => 'CC EAL5+ SECURE ELEMENT' },
    { key: 'COMPATIBILITÀ',   extract: () => '5,000+ ASSET SUPPORTATI' },
  ],
  'backup-seed': [
    { key: 'MATERIALE',       extract: () => 'TITANIO GRADO 2' },
    { key: 'RESISTENZA',      extract: () => 'FUOCO 1,665°C — CORROSIONE' },
    { key: 'CAPACITÀ',        extract: () => '24 WORD BIP39' },
    { key: 'FORMATO',         extract: () => 'STAMPING LETTERE 4mm' },
    { key: 'GARANZIA',        extract: () => 'A VITA' },
    { key: 'DIMENSIONI',      extract: () => '102 × 38 × 6 mm' },
  ],
  'rfid-faraday': [
    { key: 'SCHERMATURA',     extract: () => '99 dB ATTENUAZIONE RF' },
    { key: 'FREQUENZE',       extract: () => 'RFID/NFC/GSM/WiFi/BT' },
    { key: 'MATERIALE',       extract: () => 'GABBIA DI FARADAY TESSUTA' },
    { key: 'CAPACITÀ',        extract: () => 'FINO A 2 WALLET + PHONE' },
    { key: 'IP RATING',       extract: () => 'IMPERMEABILE IP67' },
    { key: 'CERTIFICAZIONE',  extract: () => 'MIL-STD-461 COMPLIANT' },
  ],
  'security-key': [
    { key: 'PROTOCOLLI',      extract: () => 'FIDO2 / U2F / OTP / PIV' },
    { key: 'CONNESSIONI',     extract: () => 'USB-A + NFC + LIGHTNING' },
    { key: 'CIFRATURA',       extract: () => 'ECC P-256 — HARDWARE' },
    { key: 'ACCOUNT',         extract: () => 'ILLIMITATI ON-DEVICE' },
    { key: 'RESISTENZA',      extract: () => 'IP68 — CRUSH-PROOF' },
    { key: 'COMPAT.',         extract: () => 'GOOGLE · MS · GITHUB · 1PW' },
  ],
  'privacy-screen': [
    { key: 'ANGOLO PRIVACY',  extract: () => '±30° BLACKOUT' },
    { key: 'FILTRO LUCE BLU', extract: () => '99% UV BLOCK' },
    { key: 'FINITURA',        extract: () => 'MATTE ANTI-RIFLESSO' },
    { key: 'COMPATIBILITÀ',   extract: () => 'LAPTOP 13"–16"' },
    { key: 'ATTACCO',         extract: () => 'CLIP MAGNETICI' },
    { key: 'PESO',            extract: () => '210 g' },
  ],
  'encrypted-comms': [
    { key: 'CIFRATURA',       extract: () => 'AES-256-GCM E2E' },
    { key: 'PROTOCOLLO',      extract: () => 'SIGNAL / MATRIX / XMPP' },
    { key: 'LOG',             extract: () => 'ZERO — NO METADATA' },
    { key: 'AUTONOMIA',       extract: () => '72H STANDBY' },
    { key: 'HARDWARE',        extract: () => 'OPEN-SOURCE VERIFIED' },
    { key: 'SIM',             extract: () => 'DUAL-SIM eSIM SUPPORT' },
  ],
  'cockpits-seats': [
    { key: 'STRUTTURA',       extract: () => 'ACCIAIO 40×40mm' },
    { key: 'REGOLAZIONI',     extract: () => '6-AXIS ADJUSTABLE' },
    { key: 'COMPATIBILITÀ',   extract: () => 'DD + BELT-DRIVE WHEELS' },
    { key: 'PEDALIERA',       extract: () => 'SLOT STANDARD 3-PEDALI' },
    { key: 'PESO MAX',        extract: () => '120 KG' },
    { key: 'MONITOR MOUNT',   extract: () => 'TRIPLE SCREEN READY' },
  ],
  'steering-wheels': [
    { key: 'TIPO',            extract: () => 'DIRECT DRIVE' },
    { key: 'FORZA FFB',       extract: () => 'FINO A 20 Nm' },
    { key: 'RISOLUZIONE',     extract: () => '16 BIT ENCODER' },
    { key: 'COMPATIBILITÀ',   extract: () => 'PC / PS4 / PS5 / XBOX' },
    { key: 'PROTOCOLLO',      extract: () => 'USB HID — PLUG & PLAY' },
    { key: 'PESO',            extract: () => '4.2 KG' },
  ],
  'shifters-handbrakes': [
    { key: 'TIPO',            extract: () => 'H-SHIFTER + HANDBRAKE' },
    { key: 'SENSORE',         extract: () => 'MAGNETICO HALL EFFECT' },
    { key: 'MARCE',           extract: () => '7 + RETROMARCIA' },
    { key: 'MATERIALE',       extract: () => 'ALLUMINIO ANODIZZATO' },
    { key: 'COMPATIBILITÀ',   extract: () => 'PC / CONSOLE — USB' },
    { key: 'FORZA LEVA',      extract: () => 'REGOLABILE 0.5–2.0 KG' },
  ],
};

function getProductSpecs(product: BundleSlotProduct): SpecLine[] {
  const tpl = product.sub_category
    ? SPEC_TEMPLATES[product.sub_category] ?? []
    : [];
  return tpl.map(({ key, extract }) => ({ key, value: extract(product.name) }));
}

// ── useScanText hook ──────────────────────────────────────────────────────────

function useScanText(finalValue: string, active: boolean, delay = 0): string {
  const [display, setDisplay] = useState('');
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._/-';

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout>;
    const SCRAMBLE_FRAMES = 8;

    timer = setTimeout(() => {
      const run = setInterval(() => {
        if (frame >= SCRAMBLE_FRAMES) {
          setDisplay(finalValue);
          clearInterval(run);
          return;
        }
        // Gradually reveal from left
        const revealed = finalValue.slice(0, Math.floor((frame / SCRAMBLE_FRAMES) * finalValue.length));
        const noise = Array.from({ length: finalValue.length - revealed.length }, () =>
          CHARS[Math.floor(Math.random() * CHARS.length)],
        ).join('');
        setDisplay(revealed + noise);
        frame++;
      }, 45);
      return () => clearInterval(run);
    }, delay);

    return () => clearTimeout(timer);
  }, [active, finalValue, delay]);

  return display;
}

// ── Corner glyph ──────────────────────────────────────────────────────────────

function CornerGlyphs() {
  const CYAN = '#22d3ee';
  const style = (pos: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    fontFamily: 'monospace',
    fontSize: '9px',
    color: `${CYAN}66`,
    letterSpacing: '0.05em',
    lineHeight: 1.2,
    pointerEvents: 'none',
    ...pos,
  });

  return (
    <>
      {/* Top-left */}
      <div style={style({ top: 12, left: 16 })}>
        <div style={{ color: CYAN, fontSize: '10px' }}>⬡ SYSTEM_SCAN_ACTIVE</div>
        <div>[ 41.9028° N, 12.4964° E ]</div>
      </div>
      {/* Top-right */}
      <div style={style({ top: 12, right: 16, textAlign: 'right' })}>
        <div>CLASSIFICATION: RESTRICTED</div>
        <div>PROTOCOL: KITWER-INTEL v2.6</div>
      </div>
      {/* Bottom-left */}
      <div style={style({ bottom: 12, left: 16 })}>
        <div>UPLINK: ENCRYPTED</div>
        <div style={{ color: `${CYAN}44` }}>SYS_ID: KW26-{Math.floor(Date.now() / 100000)}</div>
      </div>
      {/* Bottom-right */}
      <div style={style({ bottom: 12, right: 16, textAlign: 'right' })}>
        <div>ASSET ANALISI COMPLETATA</div>
        <div>FREQ: 868 MHz — AES-128</div>
      </div>
    </>
  );
}

// ── HUD Spec Row ──────────────────────────────────────────────────────────────

function HudSpecRow({ spec, active, index }: { spec: SpecLine; active: boolean; index: number }) {
  const CYAN = '#22d3ee';
  const scanned = useScanText(spec.value, active, index * 80);

  return (
    <div
      className="flex items-start justify-between py-1.5 gap-4"
      style={{ borderBottom: `1px solid ${CYAN}18` }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#3f3f46', letterSpacing: '0.15em', flexShrink: 0 }}>
        {spec.key}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: CYAN, letterSpacing: '0.08em', textAlign: 'right' }}>
        {scanned || '···'}
      </span>
    </div>
  );
}

// ── Product Intel Modal ───────────────────────────────────────────────────────

function ProductIntelModal({
  product,
  onClose,
}: {
  product: BundleSlotProduct | null;
  onClose: () => void;
}) {
  const CYAN = '#22d3ee';
  const [activeImg, setActiveImg]   = useState(0);
  const [imgError,  setImgError]    = useState(false);
  const [specsReady, setSpecsReady] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);

  // Zoom state (desktop)
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const imgX    = useTransform(mouseX, [0, 1], ['-10%', '10%']);
  const imgY    = useTransform(mouseY, [0, 1], ['-10%', '10%']);

  // Build gallery: image_urls first, fallback to image_url
  const gallery: string[] = product
    ? [
        ...(product.image_urls ?? []).filter(u => u?.startsWith('http')),
      ].filter((u, i, a) => a.indexOf(u) === i) // deduplica
    : [];
  if (gallery.length === 0 && product?.image_url?.startsWith('http')) {
    gallery.push(product.image_url);
  }
  const currentImg = !imgError && gallery[activeImg] ? gallery[activeImg] : null;

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    setImgError(false);
    setActiveImg(0);
    setSpecsReady(false);
    const t = setTimeout(() => setSpecsReady(true), 300);
    return () => clearTimeout(t);
  }, [product]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Double-tap zoom state (mobile)
  const [mobileZoom, setMobileZoom] = useState(false);
  const lastTap = useRef(0);
  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) setMobileZoom(z => !z);
    lastTap.current = now;
  }

  if (!product) return null;

  const specs = getProductSpecs(product);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top)  / rect.height);
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  const desktopContent = (
    <div className="flex h-full" style={{ minHeight: 0 }}>

      {/* LEFT — Image + Gallery */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ background: '#040404', borderRight: `1px solid ${CYAN}22` }}
      >
        {/* Main image zoom area */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden cursor-zoom-in relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { mouseX.set(0.5); mouseY.set(0.5); }}
        >
          {currentImg ? (
            <motion.div
              className="w-full h-full flex items-center justify-center"
              whileHover={{ scale: 2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              style={{ x: imgX, y: imgY }}
            >
              <img
                src={currentImg}
                alt={product.name}
                onError={() => setImgError(true)}
                className="max-w-[85%] max-h-[85%] object-contain select-none"
                draggable={false}
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ImageOff size={40} style={{ color: '#27272a' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#3f3f46' }}>
                // ASSET_IMAGE_UNAVAILABLE
              </span>
            </div>
          )}
          {/* Zoom hint */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-sm"
            style={{ background: `${CYAN}11`, border: `1px solid ${CYAN}22`, pointerEvents: 'none' }}
          >
            <ZoomIn size={10} style={{ color: CYAN }} />
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: `${CYAN}88` }}>
              HOVER × 2 ZOOM
            </span>
          </div>
        </div>

        {/* Thumbnail strip — visibile solo se ci sono ≥2 immagini */}
        {gallery.length >= 2 && (
          <div
            className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
            style={{ borderTop: `1px solid ${CYAN}18`, background: '#030303' }}
          >
            {gallery.map((url, i) => {
              const isActive = i === activeImg;
              return (
                <button
                  key={i}
                  onClick={() => { setActiveImg(i); setImgError(false); }}
                  className="shrink-0 rounded-sm overflow-hidden transition-all"
                  style={{
                    width:  52,
                    height: 52,
                    border: isActive ? `2px solid ${CYAN}` : `1px solid ${CYAN}22`,
                    boxShadow: isActive ? `0 0 8px ${CYAN}55` : 'none',
                    background: '#080808',
                    opacity: isActive ? 1 : 0.5,
                  }}
                  title={`Immagine ${i + 1}`}
                >
                  <img
                    src={url}
                    alt={`${product.name} — vista ${i + 1}`}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </button>
              );
            })}
            <span
              className="shrink-0 ml-1"
              style={{ fontFamily: 'monospace', fontSize: '9px', color: `${CYAN}55` }}
            >
              {activeImg + 1}/{gallery.length}
            </span>
          </div>
        )}
      </div>

      {/* RIGHT — HUD */}
      <div
        className="w-[340px] flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ background: '#060606' }}
      >
        {/* Product header */}
        <div className="p-5" style={{ borderBottom: `1px solid ${CYAN}18` }}>
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm mb-3"
            style={{ background: `${CYAN}0d`, border: `1px solid ${CYAN}33` }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: CYAN, letterSpacing: '0.2em' }}>
              ASSET INTEL — SCHEDA TECNICA
            </span>
          </div>
          <h3
            style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#e4e4e7', lineHeight: 1.3 }}
          >
            {product.name}
          </h3>
        </div>

        {/* Spec lines */}
        <div className="p-5 flex-1">
          {specs.length > 0 ? (
            <>
              <div
                className="flex items-center gap-2 mb-3"
                style={{ fontFamily: 'monospace', fontSize: '10px', color: `${CYAN}66`, letterSpacing: '0.2em' }}
              >
                <span className="h-px flex-1" style={{ background: `${CYAN}22` }} />
                SPECIFICHE TECNICHE
                <span className="h-px flex-1" style={{ background: `${CYAN}22` }} />
              </div>
              <div className="space-y-0">
                {specs.map((spec, i) => (
                  <HudSpecRow key={spec.key} spec={spec} active={specsReady} index={i} />
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#3f3f46' }}>
              // SPECS_NOT_AVAILABLE_FOR_THIS_SUB_CATEGORY
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-5">
            {product.is_top_tier && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm"
                style={{ background: `${CYAN}0d`, border: `1px solid ${CYAN}33`, fontFamily: 'monospace', fontSize: '9px', color: CYAN }}
              >
                <ShieldCheck size={9} />TOP-TIER ASSET
              </span>
            )}
            {product.is_budget_king && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm"
                style={{ background: '#f59e0b0d', border: '1px solid #f59e0b33', fontFamily: 'monospace', fontSize: '9px', color: '#f59e0b' }}
              >
                <Star size={9} className="fill-amber-400" />BUDGET KING
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Mobile layout (Bottom Sheet for specs) ─────────────────────────────────
  const mobileContent = (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Image top */}
      {/* Image + thumbnail strip mobile */}
      <div className="flex flex-col" style={{ flex: '1 1 0', minHeight: 0 }}>
        <div
          className="flex-1 flex items-center justify-center overflow-hidden relative"
          style={{ background: '#040404' }}
          onTouchEnd={handleDoubleTap}
        >
          {currentImg ? (
            <motion.img
              src={currentImg}
              alt={product.name}
              onError={() => setImgError(true)}
              animate={{ scale: mobileZoom ? 2 : 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="max-w-[85%] max-h-[85%] object-contain select-none"
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ImageOff size={36} style={{ color: '#27272a' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#3f3f46' }}>
                // IMAGE_UNAVAILABLE
              </span>
            </div>
          )}
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-sm"
            style={{ background: `${CYAN}11`, border: `1px solid ${CYAN}22`, pointerEvents: 'none' }}
          >
            <ZoomIn size={9} style={{ color: CYAN }} />
            <span style={{ fontFamily: 'monospace', fontSize: '8px', color: `${CYAN}88` }}>
              DOPPIO TAP × ZOOM
            </span>
          </div>
        </div>

        {/* Mobile thumbnail strip */}
        {gallery.length >= 2 && (
          <div
            className="flex items-center gap-2 px-3 py-2 overflow-x-auto"
            style={{ borderTop: `1px solid ${CYAN}18`, background: '#030303' }}
          >
            {gallery.map((url, i) => {
              const isActive = i === activeImg;
              return (
                <button
                  key={i}
                  onClick={() => { setActiveImg(i); setImgError(false); setMobileZoom(false); }}
                  className="shrink-0 rounded-sm overflow-hidden"
                  style={{
                    width: 44, height: 44,
                    border: isActive ? `2px solid ${CYAN}` : `1px solid ${CYAN}22`,
                    background: '#080808',
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  <img src={url} alt="" className="w-full h-full object-contain" draggable={false} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom sheet — specs */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 35, delay: 0.15 }}
        className="overflow-y-auto"
        style={{
          maxHeight: '42vh',
          background: '#060606',
          borderTop: `1px solid ${CYAN}33`,
        }}
      >
        <div className="p-4">
          <p
            className="font-bold leading-snug mb-3"
            style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e4e4e7' }}
          >
            {product.name}
          </p>
          {specs.length > 0 ? (
            <div>
              {specs.map((spec, i) => (
                <HudSpecRow key={spec.key} spec={spec} active={specsReady} index={i} />
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#3f3f46' }}>
              // NO SPECS
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative overflow-hidden"
          style={{
            width:        isMobile ? '100vw'  : 'min(90vw, 900px)',
            height:       isMobile ? '100dvh' : 'min(85vh, 620px)',
            border:       `1px solid ${CYAN}44`,
            boxShadow:    `0 0 60px ${CYAN}18, 0 0 120px ${CYAN}08`,
            background:   '#050505',
            borderRadius: isMobile ? 0 : '2px',
          }}
        >
          {/* Corner glyphs — desktop only */}
          {!isMobile && <CornerGlyphs />}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute z-10 flex items-center justify-center rounded-sm transition-all"
            style={{
              top: 12, right: 12,
              width: 28, height: 28,
              border: `1px solid ${CYAN}33`,
              background: '#050505',
              color: `${CYAN}88`,
            }}
          >
            <X size={14} />
          </button>

          {/* Top scan bar */}
          <div
            className="absolute top-0 left-0 right-0 z-10"
            style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)` }}
          />

          {/* Content */}
          {isMobile ? mobileContent : desktopContent}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Scarcity badge ────────────────────────────────────────────────────────────

function ScarcityBadge({ units }: { units: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 900);
    return () => clearInterval(id);
  }, []);

  const color = units <= 1 ? '#ef4444' : '#f59e0b';

  return (
    <div
      className="absolute top-3 right-3 z-10 px-2 py-1 rounded-sm text-[9px] font-mono font-bold tracking-wider uppercase transition-opacity"
      style={{
        border:     `1px solid ${color}55`,
        background: `${color}18`,
        color,
        opacity:    visible ? 1 : 0.25,
      }}
    >
      ⚠ DISP: {units} UNITÀ NEL QUADRANTE
    </div>
  );
}

// ── Product thumb ─────────────────────────────────────────────────────────────

function ProductThumb({ src, name }: { src: string | null | undefined; name: string }) {
  const [errored, setErrored] = useState(false);
  const valid = !errored && !!src && src.startsWith('http');

  return (
    <div className="relative w-10 h-10 shrink-0 rounded-sm overflow-hidden" style={{ border: '1px solid #27272a', background: '#09090b' }}>
      {valid ? (
        <img src={src!} alt={name} className="w-full h-full object-cover" onError={() => setErrored(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageOff size={13} style={{ color: '#3f3f46' }} />
        </div>
      )}
    </div>
  );
}

// ── Product row (clickable) ───────────────────────────────────────────────────

function ProductRow({
  product,
  slotLabel,
  formatPrice,
  onInspect,
}: {
  product:     BundleSlotProduct;
  slotLabel:   string;
  formatPrice: (n: number) => string;
  onInspect:   (p: BundleSlotProduct) => void;
}) {
  const CYAN = '#22d3ee';
  const imgSrc =
    product.image_urls?.[0]?.startsWith('http') ? product.image_urls[0]
    : product.image_url?.startsWith('http')      ? product.image_url
    : null;

  return (
    <li
      className="flex items-start gap-2.5 rounded-sm transition-all cursor-pointer group"
      style={{ padding: '4px 4px' }}
      onClick={() => onInspect(product)}
      title="Clicca per analizzare asset"
    >
      <ProductThumb src={imgSrc} name={product.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <CheckCircle2 size={11} className="shrink-0 mt-0.5" style={{ color: CYAN }} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest leading-none mb-0.5" style={{ color: '#3f3f46' }}>{slotLabel}</p>
            <p
              className="text-sm font-sans leading-snug truncate group-hover:underline"
              style={{ color: '#d4d4d8', textDecorationColor: `${CYAN}55` }}
              title={product.name}
            >
              {product.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {product.is_top_tier && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm font-mono text-[9px]" style={{ background: `${CYAN}0d`, border: `1px solid ${CYAN}33`, color: CYAN }}>
                  <ShieldCheck size={8} className="shrink-0" />TOP-TIER
                </span>
              )}
              {product.is_budget_king && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm font-mono text-[9px]" style={{ background: '#f59e0b0d', border: '1px solid #f59e0b33', color: '#f59e0b' }}>
                  <Star size={8} className="fill-amber-400" />BUDGET KING
                </span>
              )}
              {/* Intel hint */}
              <span
                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm font-mono text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}22`, color: `${CYAN}88` }}
              >
                ⬡ INSPECT
              </span>
              {product.product_url && (
                <a
                  href={product.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm font-mono text-[9px]"
                  style={{ color: '#52525b' }}
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={7} />AMZ
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <span className="font-mono text-xs font-semibold shrink-0 pt-1" style={{ color: CYAN }}>
        ~{formatPrice(product.price)}
      </span>
    </li>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-sm animate-pulse" style={{ border: '1px solid #1c1c1c', background: '#0d0d0d' }}>
      <div className="p-4 space-y-3">
        <div className="h-4 w-24 rounded-sm" style={{ background: '#1c1c1c' }} />
        <div className="h-5 w-40 rounded-sm" style={{ background: '#1c1c1c' }} />
        <div className="h-3 w-28 rounded-sm" style={{ background: '#1c1c1c' }} />
        <div className="h-10 rounded-sm" style={{ background: '#1c1c1c' }} />
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-2">
            <div className="w-10 h-10 rounded-sm shrink-0" style={{ background: '#1c1c1c' }} />
            <div className="flex-1 h-10 rounded-sm" style={{ background: '#1c1c1c' }} />
          </div>
        ))}
        <div className="h-12 rounded-sm" style={{ background: '#1c1c1c' }} />
      </div>
    </div>
  );
}

// ── Bundle Card ───────────────────────────────────────────────────────────────

function BundleCard({
  bundle,
  isActive,
  onInspect,
}: {
  bundle:    ResolvedBundle;
  isActive:  boolean;
  onInspect: (p: BundleSlotProduct) => void;
}) {
  const { convertPrice } = useIntl();
  // formatBundlePrice: usa solo exchange rate — il prezzo nel DB è già finale (markup applicato in import)
  const formatBundlePrice = (n: number) => convertPrice(n);
  const { addItem }     = useCart();
  const router          = useRouter();
  const [adding, setAdding] = useState(false);

  const isElite = bundle.badgeColor === 'amber';

  const handleCheckout = () => {
    if (adding || bundle.products.length === 0) return;
    setAdding(true);
    for (const p of bundle.products) {
      addItem({
        id:             p.id,
        name:           p.name,
        price:          p.price,
        image_url:      p.image_url ?? undefined,
        image_urls:     p.image_urls ?? undefined,
        sub_category:   p.sub_category ?? undefined,
        variants:       p.variants ?? undefined,
        is_budget_king: p.is_budget_king,
      });
    }
    router.push('/checkout');
  };

  return (
    <div
      className="relative flex flex-col rounded-sm h-full transition-all duration-400"
      style={{
        border:     isActive ? '1px solid #ff9a3ebb' : `1px solid ${isElite ? '#f59e0b33' : '#7c3aed33'}`,
        background: '#0a0a0a',
        boxShadow:  isActive ? '0 0 28px rgba(255,154,62,0.22), inset 0 0 20px rgba(255,154,62,0.04)' : 'none',
        transform:  isActive ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <ScarcityBadge units={bundle.scarcityUnits} />

      <div className="p-4 pb-2">
        <div
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm font-mono text-[10px] font-bold tracking-widest uppercase"
          style={{
            background: isElite ? '#f59e0b0d' : '#7c3aed0d',
            border:     isElite ? '1px solid #f59e0b44' : '1px solid #7c3aed44',
            color:      isElite ? '#f59e0b' : '#a78bfa',
          }}
        >
          <Zap size={9} className="shrink-0" />
          {bundle.badge}
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 flex flex-col">
        <h3 className="font-mono font-extrabold text-base text-white leading-tight">{bundle.title}</h3>
        <p className="font-mono text-[9px] tracking-[0.25em] uppercase mt-0.5 mb-3" style={{ color: '#3f3f46' }}>{bundle.subtitle}</p>
        <p className="text-sm font-sans leading-relaxed mb-4" style={{ color: '#71717a' }}>{bundle.description}</p>

        {/* Products */}
        <ul className="space-y-1 mb-4 flex-1">
          {bundle.products.map((p, i) => (
            <ProductRow
              key={p.id}
              product={p}
              slotLabel={bundle.slotLabels[i] ?? ''}
              formatPrice={formatBundlePrice}
              onInspect={onInspect}
            />
          ))}
          {bundle.slotLabels.slice(bundle.products.length).map((label, i) => (
            <li key={`empty-${i}`} className="flex items-center gap-2.5 opacity-40">
              <div className="w-10 h-10 shrink-0 rounded-sm border border-dashed flex items-center justify-center" style={{ borderColor: '#3f3f46' }}>
                <ImageOff size={11} style={{ color: '#52525b' }} />
              </div>
              <span className="text-xs font-mono italic" style={{ color: '#3f3f46' }}>{label} — in arrivo</span>
            </li>
          ))}
        </ul>

        {/* Pricing */}
        <div className="pt-3 mb-3 space-y-1.5" style={{ borderTop: '1px solid #1c1c1c' }}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: '#3f3f46' }}>
              Prezzo mercato
            </span>
            <span className="font-mono text-sm font-semibold line-through" style={{ color: '#3f3f46' }}>
              {bundle.barratoPrice > 0 ? formatBundlePrice(bundle.barratoPrice) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: '#22d3ee' }}>Prezzo Bundle</span>
              <span className="font-mono text-[8px] px-1 py-0.5 rounded-sm" style={{ background: '#22d3ee11', border: '1px solid #22d3ee33', color: '#22d3ee' }}>
                −{bundle.discountPct}%
              </span>
            </div>
            <span
              className="font-mono font-extrabold text-2xl tracking-tight"
              style={{ color: '#22d3ee', textShadow: '0 0 14px rgba(34,211,238,0.6)' }}
            >
              {bundle.bundlePrice > 0 ? `~${formatBundlePrice(bundle.bundlePrice)}` : 'Variabile'}
            </span>
          </div>
          {bundle.bundlePrice > 0 && bundle.barratoPrice > bundle.bundlePrice && (
            <p className="font-mono text-[9px] text-right" style={{ color: '#22d3ee88' }}>
              Risparmi ~{formatBundlePrice(Math.round((bundle.barratoPrice - bundle.bundlePrice) * 100) / 100)}
            </p>
          )}
        </div>

        {!bundle.isComplete && (
          <p className="text-[10px] font-mono mb-3" style={{ color: '#f59e0b88' }}>⚠ Slot incompleti — DB in aggiornamento</p>
        )}

        <p className="text-[11px] font-sans mb-4 leading-snug" style={{ color: '#52525b' }}>✦ {bundle.highlight}</p>

        <button
          onClick={handleCheckout}
          disabled={adding || bundle.products.length === 0}
          className="w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 rounded-sm transition-all active:scale-95"
          style={{
            background: adding ? '#1c1c1c' : '#ff9a3e',
            color:      adding ? '#52525b' : '#000',
            boxShadow:  adding ? 'none' : '0 0 18px rgba(255,154,62,0.4)',
            cursor:     adding || bundle.products.length === 0 ? 'not-allowed' : 'pointer',
            opacity:    bundle.products.length === 0 ? 0.5 : 1,
          }}
        >
          <ShoppingCart size={13} />
          {adding ? 'CARICAMENTO...' : '[ ACQUISTA BUNDLE ]'}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BundleSection() {
  const [bundles,  setBundles]  = useState<ResolvedBundle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Modal state
  const [inspecting, setInspecting] = useState<BundleSlotProduct | null>(null);

  const sliderRef = useRef<HTMLDivElement>(null);
  const cardRefs  = useRef<Map<string, HTMLDivElement>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res  = await fetch('/api/bundles');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: ResolvedBundle[] = json.bundles ?? [];
      setBundles(list);
      if (list.length > 0) setActiveId(list[Math.floor(list.length / 2)].id);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Intersection Observer
  useEffect(() => {
    if (!sliderRef.current || bundles.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-bundle-id');
          if (id && entry.intersectionRatio > (best?.ratio ?? 0)) {
            best = { id, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActiveId(best.id);
      },
      { root: sliderRef.current, threshold: [0.4, 0.6, 0.8, 1.0] },
    );

    for (const [, el] of cardRefs.current) observer.observe(el);
    return () => observer.disconnect();
  }, [bundles]);

  function scrollTo(dir: 'prev' | 'next') {
    if (!sliderRef.current) return;
    const CARD_W = sliderRef.current.scrollWidth / Math.max(bundles.length, 1);
    sliderRef.current.scrollBy({ left: dir === 'next' ? CARD_W : -CARD_W, behavior: 'smooth' });
  }

  function scrollToIndex(idx: number) {
    const bundle = bundles[idx];
    if (!bundle || !sliderRef.current) return;
    const el = cardRefs.current.get(bundle.id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  const skeletons = loading ? [0, 1, 2, 3, 4] : [];

  return (
    <>
      {/* ── Modal ── */}
      {inspecting && (
        <ProductIntelModal product={inspecting} onClose={() => setInspecting(null)} />
      )}

      <section id="bundles" className="py-16 sm:py-20" style={{ background: '#050505' }}>
        {/* Header */}
        <div className="text-center mb-10 px-4">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-sm" style={{ border: '1px solid #7c3aed33', background: '#7c3aed08' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#a78bfa' }} />
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: '#a78bfa' }}>KIT DI SOPRAVVIVENZA DIGITALE</span>
          </div>
          <h2 className="font-mono font-extrabold text-3xl sm:text-4xl text-white">
            BUNDLE <span style={{ color: '#ff9a3e' }}>TATTICI</span>
          </h2>
          <p className="mt-2 text-sm font-sans" style={{ color: '#52525b' }}>
            Setup pre-configurati testati dal team Kitwer26. Attiva il protocollo giusto per la tua missione.
          </p>
          {!loading && bundles.length > 0 && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: '#27272a' }}>
              // {bundles.length} configurazioni attive — Clicca un asset per analizzarlo
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="font-mono text-xs" style={{ color: '#3f3f46' }}>// BUNDLE_FETCH_FAILED</p>
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-xs transition-colors"
              style={{ border: '1px solid #3f3f46', color: '#71717a' }}
            >
              <RefreshCw size={11} /> [ RETRY ]
            </button>
          </div>
        )}

        {/* Slider wrapper */}
        {!error && (
          <div className="relative">
            {bundles.length > 1 && (
              <button
                onClick={() => scrollTo('prev')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center h-9 w-9 rounded-sm transition-all"
                style={{ border: '1px solid #22d3ee22', background: '#0a0a0a', color: '#22d3ee' }}
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <div
              ref={sliderRef}
              className="flex gap-4 overflow-x-auto pb-6 px-4 sm:px-12"
              style={{
                scrollSnapType:          'x mandatory',
                scrollBehavior:          'smooth',
                msOverflowStyle:         'none',
                scrollbarWidth:          'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {skeletons.map(i => (
                <div key={i} className="flex-none" style={{ width: 'min(82vw, 360px)', scrollSnapAlign: 'center' }}>
                  <SkeletonCard />
                </div>
              ))}

              {!loading && bundles.map((b) => {
                const isActive = b.id === activeId;
                return (
                  <div
                    key={b.id}
                    data-bundle-id={b.id}
                    ref={el => { if (el) cardRefs.current.set(b.id, el); else cardRefs.current.delete(b.id); }}
                    className="flex-none transition-opacity duration-300"
                    style={{
                      width:           'min(82vw, 360px)',
                      scrollSnapAlign: 'center',
                      opacity:         isActive ? 1 : 0.6,
                    }}
                  >
                    <BundleCard bundle={b} isActive={isActive} onInspect={setInspecting} />
                  </div>
                );
              })}
            </div>

            {bundles.length > 1 && (
              <button
                onClick={() => scrollTo('next')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center h-9 w-9 rounded-sm transition-all"
                style={{ border: '1px solid #22d3ee22', background: '#0a0a0a', color: '#22d3ee' }}
              >
                <ChevronRight size={16} />
              </button>
            )}

            {!loading && bundles.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-2">
                {bundles.map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => scrollToIndex(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width:      b.id === activeId ? '20px' : '6px',
                      height:     '6px',
                      background: b.id === activeId ? '#ff9a3e' : '#27272a',
                    }}
                    aria-label={`Bundle ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
