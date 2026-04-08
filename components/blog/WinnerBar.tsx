'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface WinnerBarProps {
  /** Label del prodotto A (colonna 1) */
  labelA:  string;
  /** Label del prodotto B (colonna 2) */
  labelB:  string;
  /** 0–100: percentuale a favore di A. 50 = pari */
  scoreA:  number;
  /** Titolo della categoria confrontata */
  title:   string;
}

export default function WinnerBar({ labelA, labelB, scoreA, title }: WinnerBarProps) {
  const scoreB = 100 - scoreA;
  const winner = scoreA > scoreB ? labelA : scoreA < scoreB ? labelB : null;

  return (
    <div className="my-3 px-1">
      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        <span>{title}</span>
        {winner && (
          <span className="flex items-center gap-1 text-orange-400">
            <Trophy className="h-2.5 w-2.5" />
            {winner}
          </span>
        )}
      </div>

      <div className="flex h-2 overflow-hidden rounded-none bg-zinc-800">
        <motion.div
          initial={{ width: '50%' }}
          whileInView={{ width: `${scoreA}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full ${scoreA >= scoreB ? 'bg-cyan-500' : 'bg-zinc-600'}`}
        />
        <motion.div
          initial={{ width: '50%' }}
          whileInView={{ width: `${scoreB}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full ${scoreB > scoreA ? 'bg-orange-500' : 'bg-zinc-700'}`}
        />
      </div>

      <div className="mt-1 flex justify-between font-mono text-[9px] text-zinc-700">
        <span>{labelA} {scoreA}%</span>
        <span>{scoreB}% {labelB}</span>
      </div>
    </div>
  );
}
