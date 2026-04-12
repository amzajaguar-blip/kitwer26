"use client";

/**
 * KernelHero – Hero section cinematografica
 * Effetti: scan-line, grid, neon glow, typing animation, badge animati
 * CTA principale + trust bar inferiore
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Zap,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  CreditCard,
  Truck,
  Eye,
  Radio,
} from "lucide-react";

// ─── TYPING ANIMATION WORDS ──────────────────────────────────────

const TYPING_WORDS = [
  "INFRANGIBILE",
  "CERTIFICATO",
  "AIR-GAPPED",
  "ZERO TRUST",
  "AES-256",
];

// ─── BADGE CERTIFICAZIONI ────────────────────────────────────────

const BADGES = [
  { icon: Shield, label: "Kernel Certified", sub: "v2026" },
  { icon: Radio, label: "Air-Gapped", sub: "Hardware" },
  { icon: Eye, label: "Zero Trust", sub: "Architecture" },
  { icon: Lock, label: "AES-256", sub: "Encryption" },
];

// ─── TRUST BAR ───────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: CreditCard, label: "Pagamenti crittografati", sub: "SSL + 3DS" },
  { icon: Truck, label: "Spedizione anonima", sub: "No nome su pacco" },
  { icon: Shield, label: "Kernel Guarantee", sub: "30gg rimborso" },
  { icon: Lock, label: "Zero dati salvati", sub: "No-log policy" },
];

// ─────────────────────────────────────────────────────────────────

export default function KernelHero() {
  const [typedText, setTypedText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Typing effect
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const currentWord = TYPING_WORDS[wordIndex];
    const speed = isDeleting ? 60 : 100;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentWord.length) {
        setTypedText(currentWord.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      } else if (isDeleting && charIndex > 0) {
        setTypedText(currentWord.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      } else if (!isDeleting && charIndex === currentWord.length) {
        setTimeout(() => setIsDeleting(true), 1800);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setWordIndex((w) => (w + 1) % TYPING_WORDS.length);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [mounted, charIndex, isDeleting, wordIndex]);

  return (
    <section className="kernel-hero relative min-h-screen flex flex-col overflow-hidden">

      {/* ── BACKGROUND LAYERS ────────────────────────────────── */}

      {/* Griglia tattica */}
      <div className="absolute inset-0 kernel-grid-bg opacity-[0.04]" />

      {/* Scan-lines orizzontali */}
      <div className="absolute inset-0 kernel-scanlines pointer-events-none" />

      {/* Glow centrale */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[800px] h-[500px] bg-neon/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Glow angolo sinistro */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px]
                      bg-neon/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2
                      pointer-events-none" />

      {/* Angolo tecnico decorativo */}
      <div className="absolute top-20 right-8 hidden lg:block opacity-20">
        <div className="font-mono text-[10px] text-neon/60 leading-relaxed text-right">
          <div>SYS::KERNEL_BOOT</div>
          <div>ENCRYPTION: AES256-GCM</div>
          <div>INTEGRITY: VERIFIED ✓</div>
          <div>THREAT_LEVEL: MONITORED</div>
          <div>UPTIME: 99.97%</div>
        </div>
      </div>

      {/* ── CONTENUTO HERO ───────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col items-center justify-center
                      px-4 sm:px-6 pt-32 pb-8 text-center max-w-5xl mx-auto w-full">

        {/* Pre-label */}
        <div className="flex items-center gap-2 mb-6 animate-fade-in-down">
          <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
          <span className="font-mono text-[11px] text-neon/70 tracking-[0.3em] uppercase">
            Kernel Security Team 2026
          </span>
          <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
        </div>

        {/* HEADLINE */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black
                       text-white leading-[1.05] tracking-tight mb-2
                       animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}>
          Sicurezza a Livello
        </h1>

        {/* Typing animated word */}
        <div className="relative mb-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black
                         text-transparent bg-clip-text leading-[1.1]
                         bg-gradient-to-r from-neon via-neon/80 to-neon/60"
              style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
            {mounted ? typedText : TYPING_WORDS[0]}
            <span className="animate-blink text-neon ml-1">|</span>
          </h1>
          {/* Neon glow sotto il testo */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2
                          w-3/4 h-px bg-gradient-to-r from-transparent via-neon/50 to-transparent" />
        </div>

        {/* SUB-HEADLINE */}
        <p className="text-zinc-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto
                      leading-relaxed mb-2 animate-fade-in-up"
           style={{ animationDelay: "0.3s" }}>
          Il bunker digitale per chi{" "}
          <span className="text-white font-semibold">non si fida di nessuno.</span>
        </p>
        <p className="text-zinc-500 text-[13px] sm:text-[14px] font-mono max-w-xl mx-auto
                      mb-10 animate-fade-in-up"
           style={{ animationDelay: "0.4s" }}>
          Hardware wallet • Faraday • Privacy screen • Bundle tattici elite
        </p>

        {/* CTA BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-14
                        animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <Link
            href="/categoria/bundle-tattici"
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-lg
                       bg-neon text-black font-bold text-[15px] uppercase tracking-wide
                       hover:bg-neon/90 transition-all duration-200
                       shadow-[0_0_30px_rgba(0,255,157,0.4),0_0_60px_rgba(0,255,157,0.15)]
                       hover:shadow-[0_0_40px_rgba(0,255,157,0.6)]"
          >
            <Shield className="w-4.5 h-4.5" />
            Scegli il tuo Bunker
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>

          <Link
            href="/categoria/bundle-tattici"
            className="group flex items-center gap-2 px-6 py-3.5 rounded-lg
                       border border-white/15 text-zinc-300 hover:text-white
                       hover:border-neon/30 hover:bg-white/5
                       font-medium text-[14px] transition-all duration-200"
          >
            Vedi tutti i Bundle
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* BADGE CERTIFICAZIONI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12 w-full max-w-2xl mx-auto
                        animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          {BADGES.map((badge, i) => (
            <div
              key={badge.label}
              className="kernel-glass rounded-xl p-3 flex flex-col items-center gap-1.5
                         border border-white/8 hover:border-neon/25 transition-all duration-200
                         group cursor-default"
            >
              <badge.icon className="w-5 h-5 text-neon/70 group-hover:text-neon transition-colors" />
              <span className="text-[11px] font-semibold text-white/80 text-center leading-tight">
                {badge.label}
              </span>
              <span className="text-[9px] font-mono text-neon/50 uppercase tracking-widest">
                {badge.sub}
              </span>
            </div>
          ))}
        </div>

        {/* METRICHE FIDUCIA */}
        <div className="flex flex-wrap items-center justify-center gap-6
                        animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
          {[
            { value: "+340%", label: "Protezione dati" },
            { value: "180+", label: "Prodotti CORE" },
            { value: "100%", label: "Zero affiliate" },
            { value: "AES-256", label: "Encryption standard" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono font-black text-neon text-xl sm:text-2xl">
                {stat.value}
              </div>
              <div className="text-[11px] text-zinc-500 tracking-wide mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRUST BAR ────────────────────────────────────────── */}
      <div className="relative border-t border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-5
                        grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 rounded-lg border border-white/8 flex items-center justify-center
                              bg-white/3 group-hover:border-neon/25 group-hover:bg-neon/5
                              transition-all duration-200 flex-shrink-0">
                <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-neon transition-colors" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-zinc-200">{item.label}</p>
                <p className="text-[10px] text-zinc-500 font-mono">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
