'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface ComparisonTableProps {
  headers: string[];
  rows:    string[][];
}

export default function ComparisonTable({ headers, rows }: ComparisonTableProps) {
  const lastIdx = headers.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
      className="my-8"
    >
      {/* Desktop table (sm+) */}
      <div className="hidden overflow-x-auto rounded-none border border-cyan-500/30 sm:block">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-cyan-500/30 bg-cyan-500/10">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-widest ${
                    i === lastIdx ? 'text-orange-400' : 'text-cyan-400'
                  }`}
                >
                  {i === lastIdx && <Trophy className="mb-0.5 mr-1.5 inline h-3.5 w-3.5" />}
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-zinc-800 transition-colors hover:bg-zinc-900">
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
      </div>

      {/* Mobile stacked cards (< sm) */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row, ri) => (
          <div key={ri} className="rounded-none border border-zinc-700 bg-zinc-900/60 p-3 font-mono">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              {row[0]}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {row.slice(1, lastIdx).map((cell, ci) => (
                <div key={ci}>
                  <div className="mb-0.5 text-xs text-cyan-400/70">{headers[ci + 1]}</div>
                  <div className="text-sm text-zinc-300">{cell}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-zinc-700 pt-2">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3 w-3 text-orange-400" />
                <span className="text-xs uppercase tracking-widest text-orange-400">{headers[lastIdx]}</span>
              </div>
              <div className="mt-0.5 text-sm font-semibold text-orange-300">{row[lastIdx]}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
