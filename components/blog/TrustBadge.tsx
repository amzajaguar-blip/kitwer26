'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Star, Zap } from 'lucide-react';

type BadgeVariant = 'defcon' | 'verified' | 'top-rated' | 'bundle';

interface TrustBadgeProps {
  variant:  BadgeVariant;
  label?:   string;
  rating?:  number; // 0–5
}

const BADGE_CONFIG: Record<BadgeVariant, {
  icon:    React.ReactNode;
  colors:  string;
  pulse:   string;
  default: string;
}> = {
  defcon: {
    icon:    <ShieldCheck className="h-3.5 w-3.5" />,
    colors:  'border-red-500/60 bg-red-500/10 text-red-400',
    pulse:   'bg-red-500',
    default: 'DEFCON 1',
  },
  verified: {
    icon:    <ShieldCheck className="h-3.5 w-3.5" />,
    colors:  'border-cyan-500/60 bg-cyan-500/10 text-cyan-400',
    pulse:   'bg-cyan-500',
    default: 'VERIFICATO',
  },
  'top-rated': {
    icon:    <Star className="h-3.5 w-3.5" />,
    colors:  'border-yellow-500/60 bg-yellow-500/10 text-yellow-400',
    pulse:   'bg-yellow-500',
    default: 'TOP RATED',
  },
  bundle: {
    icon:    <Zap className="h-3.5 w-3.5" />,
    colors:  'border-orange-500/60 bg-orange-500/10 text-orange-400',
    pulse:   'bg-orange-500',
    default: 'BUNDLE -25%',
  },
};

export default function TrustBadge({ variant, label, rating }: TrustBadgeProps) {
  const cfg = BADGE_CONFIG[variant];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${cfg.colors}`}
    >
      {/* Pulse dot */}
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${cfg.pulse}`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.pulse}`} />
      </span>

      {cfg.icon}

      {rating !== undefined ? (
        <span>{rating.toFixed(1)} ★</span>
      ) : (
        <span>{label ?? cfg.default}</span>
      )}
    </motion.div>
  );
}
