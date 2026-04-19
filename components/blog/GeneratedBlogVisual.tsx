import type { ReactNode } from 'react';
import { Cpu, Home, Radio, Shield, Wallet, Zap } from 'lucide-react';
import { getBlogVisualEyebrow, getBlogVisualTheme } from '@/lib/blog/visuals';

type VisualVariant = 'card' | 'hero' | 'inline';

interface GeneratedBlogVisualProps {
  title: string;
  category: string;
  excerpt?: string;
  alt?: string;
  variant?: VisualVariant;
  badge?: string;
  className?: string;
}

function cn(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

function getIcon(category: string): ReactNode {
  const normalized = category.toLowerCase();

  if (normalized.includes('crypto')) return <Wallet className="h-4 w-4" />;
  if (normalized.includes('fpv') || normalized.includes('drone')) return <Radio className="h-4 w-4" />;
  if (normalized.includes('sim')) return <Zap className="h-4 w-4" />;
  if (normalized.includes('smart')) return <Home className="h-4 w-4" />;
  if (normalized.includes('security')) return <Cpu className="h-4 w-4" />;

  return <Shield className="h-4 w-4" />;
}

function renderMotif(motif: ReturnType<typeof getBlogVisualTheme>['motif']) {
  if (motif === 'wallet') {
    return (
      <>
        <div className="absolute left-4 top-6 h-24 w-40 border border-white/20 bg-white/5" />
        <div className="absolute left-10 top-11 h-24 w-40 border border-white/25 bg-white/10" />
        <div className="absolute right-6 top-8 h-16 w-16 border border-cyan-200/30 bg-cyan-300/10" />
        <div className="absolute right-10 top-12 grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-cyan-100/55" />
          ))}
        </div>
      </>
    );
  }

  if (motif === 'drone') {
    return (
      <>
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/5" />
        <div className="absolute left-[20%] top-[22%] h-14 w-14 rounded-full border border-orange-200/25" />
        <div className="absolute right-[20%] top-[22%] h-14 w-14 rounded-full border border-orange-200/25" />
        <div className="absolute left-[20%] bottom-[20%] h-14 w-14 rounded-full border border-orange-200/25" />
        <div className="absolute right-[20%] bottom-[20%] h-14 w-14 rounded-full border border-orange-200/25" />
        <div className="absolute left-1/2 top-[30%] h-px w-40 -translate-x-1/2 bg-white/20" />
        <div className="absolute left-1/2 top-1/2 h-40 w-px -translate-y-1/2 bg-white/20" />
      </>
    );
  }

  if (motif === 'racing') {
    return (
      <>
        <div className="absolute left-5 top-8 h-10 w-10 rounded-full border border-white/20" />
        <div className="absolute left-9 top-12 h-2 w-20 bg-gradient-to-r from-yellow-200/40 to-transparent" />
        <div className="absolute left-5 top-24 h-1.5 w-44 bg-white/10" />
        <div className="absolute left-5 top-[7.5rem] h-1.5 w-36 bg-white/10" />
        <div className="absolute right-6 top-10 flex h-24 w-24 items-end gap-2">
          <span className="w-4 bg-white/20" style={{ height: '35%' }} />
          <span className="w-4 bg-white/30" style={{ height: '56%' }} />
          <span className="w-4 bg-white/40" style={{ height: '82%' }} />
          <span className="w-4 bg-yellow-200/60" style={{ height: '100%' }} />
        </div>
        <div className="absolute bottom-8 left-5 h-px w-[70%] bg-gradient-to-r from-yellow-200/40 to-transparent" />
      </>
    );
  }

  if (motif === 'smart-home') {
    return (
      <>
        <div className="absolute left-8 top-10 h-24 w-24 rounded-t-[2rem] border border-white/20 bg-white/5" />
        <div className="absolute left-12 top-20 h-8 w-8 border border-white/20 bg-white/10" />
        <div className="absolute right-8 top-8 h-14 w-28 rounded-full border border-emerald-100/20" />
        <div className="absolute right-12 top-14 h-14 w-14 rounded-full border border-cyan-100/20" />
        <div className="absolute right-24 top-28 h-1.5 w-20 bg-white/15" />
        <div className="absolute right-24 top-[8.5rem] h-1.5 w-14 bg-white/15" />
      </>
    );
  }

  if (motif === 'security') {
    return (
      <>
        <div className="absolute left-6 top-8 h-20 w-14 border border-red-200/20 bg-red-300/5" />
        <div className="absolute left-12 top-14 h-20 w-14 border border-red-200/25 bg-red-300/8" />
        <div className="absolute right-8 top-6 h-10 w-10 border border-red-300/30">
          <div className="absolute inset-2 border border-red-200/20" />
        </div>
        <div className="absolute right-10 top-20 grid grid-cols-2 gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="h-1.5 w-6 bg-red-200/20" />
          ))}
        </div>
        <div className="absolute bottom-8 left-6 h-px w-[65%] bg-gradient-to-r from-red-400/30 to-transparent" />
        <div className="absolute bottom-12 left-6 h-px w-[45%] bg-gradient-to-r from-red-400/20 to-transparent" />
      </>
    );
  }

  return (
    <>
      <div className="absolute left-8 top-8 h-20 w-20 rotate-45 border border-white/15 bg-white/5" />
      <div className="absolute left-16 top-16 h-20 w-20 rotate-45 border border-white/25 bg-white/10" />
      <div className="absolute right-8 top-10 grid grid-cols-5 gap-1">
        {Array.from({ length: 25 }, (_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/35" />
        ))}
      </div>
      <div className="absolute bottom-10 right-10 h-16 w-32 border border-white/15 bg-white/5" />
    </>
  );
}

export default function GeneratedBlogVisual({
  title,
  category,
  excerpt,
  alt,
  variant = 'card',
  badge,
  className,
}: GeneratedBlogVisualProps) {
  const theme = getBlogVisualTheme(category);
  const eyebrow = badge ?? getBlogVisualEyebrow(category, title);
  const isHero = variant === 'hero';
  const isInline = variant === 'inline';

  return (
    <div
      aria-label={alt ?? title}
      className={cn(
        'relative overflow-hidden border',
        theme.panelClass,
        theme.borderClass,
        theme.glowClass,
        isHero && 'min-h-[18rem] sm:min-h-[22rem]',
        isInline && 'min-h-[15rem] sm:min-h-[18rem]',
        !isHero && !isInline && 'min-h-[12rem]',
        className,
      )}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br', theme.accentClass)} />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:34px_34px] opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_28%)]" />
      {renderMotif(theme.motif)}

      <div className="relative flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 border border-white/15 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/85">
            {getIcon(category)}
            <span>{theme.label}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
            {category}
          </div>
        </div>

        <div className="max-w-[30rem] space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/55">
            {eyebrow}
          </div>
          <h3 className={cn(
            'max-w-[32rem] font-mono font-extrabold tracking-tight',
            theme.textClass,
            isHero ? 'text-2xl sm:text-4xl' : isInline ? 'text-xl sm:text-2xl' : 'text-lg',
          )}>
            {title}
          </h3>
          {(excerpt || alt) && (
            <p className={cn(
              'max-w-[34rem] leading-relaxed text-white/68',
              isHero ? 'text-sm sm:text-base' : 'text-xs sm:text-sm',
            )}>
              {excerpt ?? alt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
