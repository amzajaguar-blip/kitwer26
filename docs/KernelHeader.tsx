"use client";

/**
 * KernelHeader – Nav completa Kernel Security
 * Desktop: logo + mega-menu dropdown + ticker + CTA
 * Mobile: hamburger + drawer slide-in
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  ChevronDown,
  Menu,
  X,
  Package,
  Cpu,
  Zap,
  Lock,
  Eye,
  Radio,
  Crosshair,
  ExternalLink,
} from "lucide-react";

// ─── STRUTTURA NAVIGAZIONE ───────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Bundle Tattici",
    href: "/categoria/bundle-tattici",
    icon: Package,
    highlight: true,
    badge: "⚡ TOP",
    description: "Kit multi-prodotto ad alto impatto",
    children: [
      { label: "Bundle Elite Faraday", href: "/prodotto/bundle-faraday-elite", icon: Radio, tag: "Best seller" },
      { label: "Bundle Cold Storage Pro", href: "/prodotto/bundle-cold-storage-pro", icon: Lock, tag: "Nuovo" },
      { label: "Bundle EDC Tattico", href: "/prodotto/bundle-edc-tattico", icon: Crosshair, tag: "" },
      { label: "Bundle OPSEC Completo", href: "/prodotto/bundle-opsec", icon: Eye, tag: "Esclusivo" },
      { label: "Bundle Kernel Signature", href: "/prodotto/bundle-kernel-signature", icon: Shield, tag: "🔥" },
      { label: "Vedi tutti i bundle →", href: "/categoria/bundle-tattici", icon: ExternalLink, tag: "" },
    ],
  },
  {
    label: "Crypto & Cold Storage",
    href: "/categoria/crypto",
    icon: Cpu,
    highlight: false,
    badge: "",
    description: "Hardware wallet certificati",
    children: [
      { label: "Trezor Safe 3", href: "/prodotto/trezor-safe-3", icon: Shield, tag: "AES-256" },
      { label: "NGRAVE ZERO", href: "/prodotto/ngrave-zero", icon: Lock, tag: "Air-Gapped" },
      { label: "Cypherock X1", href: "/prodotto/cypherock-x1", icon: Cpu, tag: "Shamir" },
      { label: "ColdCard Mk4", href: "/prodotto/coldcard-mk4", icon: Zap, tag: "Bitcoin only" },
      { label: "BitBox02", href: "/prodotto/bitbox02", icon: Shield, tag: "" },
      { label: "Tutto il Cold Storage →", href: "/categoria/crypto", icon: ExternalLink, tag: "" },
    ],
  },
  {
    label: "Security & Survival EDC",
    href: "/categoria/survival-edc",
    icon: Eye,
    highlight: false,
    badge: "",
    description: "Privacy, faraday, kit sopravvivenza",
    children: [
      { label: "Faraday Bags Premium", href: "/categoria/faraday", icon: Radio, tag: "" },
      { label: "Privacy Screen Filters", href: "/categoria/privacy-screen", icon: Eye, tag: "" },
      { label: "Data Blocker USB-C", href: "/prodotto/data-blocker", icon: Lock, tag: "" },
      { label: "YubiKey 5 Series", href: "/prodotto/yubikey-5", icon: Shield, tag: "FIDO2" },
      { label: "EDC Kit Tattico", href: "/categoria/edc", icon: Crosshair, tag: "" },
      { label: "Survival & Emergency →", href: "/categoria/survival", icon: ExternalLink, tag: "" },
    ],
  },
];

// ─── TICKER DEFCON ───────────────────────────────────────────────

const TICKER_ITEMS = [
  "🔴 DEFCON 2",
  "🔐 AES-256 ACTIVE",
  "🚫 NO LOGS",
  "❄️ COLD STORAGE ONLINE",
  "👁️ THREAT LEVEL: MONITORED",
  "₿ BTC $71,420",
  "🛡️ ZERO TRUST ENFORCED",
  "📡 AIR-GAPPED COMMS",
  "🔒 END-TO-END ENCRYPTED",
];

// ─────────────────────────────────────────────────────────────────

export default function KernelHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileExpandedItem, setMobileExpandedItem] = useState<string | null>(null);
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);

  // Scroll effect per sfocatura header
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Blocca scroll quando mobile menu aperto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col">

      {/* ── TICKER TOP BAR ───────────────────────────────────── */}
      <div className="kernel-ticker-bar overflow-hidden py-1.5 border-b border-neon/20">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="text-[11px] font-mono text-neon/80 mx-6 tracking-widest">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── MAIN NAV ─────────────────────────────────────────── */}
      <nav
        className={`kernel-nav transition-all duration-300 ${
          scrolled
            ? "bg-surface/95 backdrop-blur-xl border-b border-neon/10 shadow-[0_4px_30px_rgba(0,255,157,0.05)]"
            : "bg-surface/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-md border border-neon/40 flex items-center justify-center
                            bg-neon/5 group-hover:bg-neon/10 group-hover:border-neon/70
                            transition-all duration-200 shadow-[0_0_12px_rgba(0,255,157,0.15)]">
              <Shield className="w-4.5 h-4.5 text-neon" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-mono font-bold text-[13px] tracking-[0.2em] text-white uppercase">
                KERNEL
              </span>
              <span className="font-mono text-[9px] tracking-[0.3em] text-neon/70 uppercase">
                SECURITY
              </span>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => handleDropdownEnter(item.label)}
                onMouseLeave={handleDropdownLeave}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium
                    transition-all duration-150 group
                    ${item.highlight
                      ? "text-neon border border-neon/30 bg-neon/5 hover:bg-neon/10 hover:border-neon/60"
                      : "text-zinc-300 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 text-[9px] font-mono bg-neon/20 text-neon px-1.5 py-0.5 rounded-full border border-neon/30">
                      {item.badge}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      activeDropdown === item.label ? "rotate-180" : ""
                    }`}
                  />
                </Link>

                {/* DROPDOWN MEGA MENU */}
                {activeDropdown === item.label && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64"
                    onMouseEnter={() => handleDropdownEnter(item.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <div className="kernel-glass rounded-xl border border-white/10 overflow-hidden
                                    shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_30px_rgba(0,255,157,0.08)]">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-[10px] font-mono text-neon/60 uppercase tracking-widest">
                          {item.description}
                        </p>
                      </div>
                      <div className="py-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5
                                       text-zinc-300 hover:text-white group transition-colors duration-100"
                          >
                            <child.icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-neon
                                                    transition-colors duration-100 flex-shrink-0" />
                            <span className="text-[13px] flex-1">{child.label}</span>
                            {child.tag && (
                              <span className="text-[9px] font-mono text-neon/60 border border-neon/20
                                               px-1.5 py-0.5 rounded-full">
                                {child.tag}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA + MOBILE TOGGLE */}
          <div className="flex items-center gap-3">
            <Link
              href="/categoria/bundle-tattici"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-md
                         bg-neon text-black text-[12px] font-bold tracking-wide uppercase
                         hover:bg-neon/90 transition-all duration-150
                         shadow-[0_0_20px_rgba(0,255,157,0.3)]"
            >
              <Shield className="w-3.5 h-3.5" />
              Scegli il Bunker
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-md
                         border border-white/10 hover:border-neon/30 hover:bg-white/5
                         transition-all duration-150"
              aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
            >
              {mobileOpen
                ? <X className="w-5 h-5 text-zinc-300" />
                : <Menu className="w-5 h-5 text-zinc-300" />
              }
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ────────────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ top: "88px" }} // altezza ticker + nav
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`relative h-full w-full max-w-sm bg-[#0D0D0D] border-r border-white/5
                      transition-transform duration-300 ease-out overflow-y-auto
                      ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.label}>
                <button
                  onClick={() =>
                    setMobileExpandedItem(
                      mobileExpandedItem === item.label ? null : item.label
                    )
                  }
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg
                             text-zinc-200 hover:text-white hover:bg-white/5
                             font-medium text-[14px] transition-colors duration-100"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-neon" />
                    {item.label}
                    {item.badge && (
                      <span className="text-[9px] font-mono bg-neon/20 text-neon px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      mobileExpandedItem === item.label ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {mobileExpandedItem === item.label && (
                  <div className="ml-4 border-l border-white/5 pl-4 mt-1 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                                   text-zinc-400 hover:text-white hover:bg-white/5
                                   text-[13px] transition-colors duration-100"
                      >
                        <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile CTA */}
            <div className="pt-4 border-t border-white/5 mt-4">
              <Link
                href="/categoria/bundle-tattici"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg
                           bg-neon text-black font-bold text-[14px] tracking-wide uppercase
                           shadow-[0_0_25px_rgba(0,255,157,0.3)]"
              >
                <Shield className="w-4 h-4" />
                Scegli il tuo Bunker
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
