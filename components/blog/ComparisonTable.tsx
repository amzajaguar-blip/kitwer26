'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface ComparisonTableProps {
  headers: string[];
  rows:    string[][];
}

export default function ComparisonTable({ headers, rows }: ComparisonTableProps) {
  // Last column is the winner column if headers[last] includes "Vincitore" or "Vantaggio"
  const lastIdx = headers.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
      className="my-8 overflow-x-auto rounded-none border border-cyan-500/30"
    >
      <table className="w-full min-w-[560px] border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-cyan-500/30 bg-cyan-500/10">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-widest ${
                  i === lastIdx ? 'text-orange-400' : 'text-cyan-400'
                }`}
              >
                {i === lastIdx && (
                  <Trophy className="mb-0.5 mr-1.5 inline h-3.5 w-3.5" />
                )}
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-zinc-800 transition-colors hover:bg-zinc-900"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 ${
                    ci === 0
                      ? 'text-xs font-semibold uppercase tracking-wide text-zinc-400'
                      : ci === lastIdx
                        ? 'font-semibold text-orange-400'
                        : 'text-zinc-300'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
