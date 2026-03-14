import { ShieldCheck, Lock, Truck, RefreshCcw } from 'lucide-react';

interface SafeFocusProps {
  category: string;
}

export default function SafeFocus({ category }: SafeFocusProps) {
  const isCrypto   = category.toLowerCase().includes('crypto');
  const isSecurity = category.toLowerCase().includes('security') || category.toLowerCase().includes('sicurezza');

  return (
    <div className="mt-4 p-4 bg-zinc-900 border border-cyan-500/20 rounded-sm">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="text-cyan-500 w-4 h-4" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Protocollo SafeFocus™ Active
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 text-[11px] text-zinc-400 font-sans">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span>{isCrypto ? 'Sigillo Anti-Manomissione Integro' : 'Pagamento Criptato SSL'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span>Spedizione Assicurata 24/48h</span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{isCrypto ? 'Reso NON disponibile se aperto' : 'Reso Facile 14 giorni'}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>{isSecurity ? 'Privacy End-to-End Garantita' : 'Garanzia Ufficiale 24 Mesi'}</span>
        </div>
      </div>
    </div>
  );
}
