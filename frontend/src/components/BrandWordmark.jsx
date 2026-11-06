import { Scale } from 'lucide-react';

export default function BrandWordmark({ size = 'md', className = '' }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <div className={`flex items-center gap-2.5 font-display select-none ${className}`}>
      {/* Judicial Scale Icon Emblem */}
      <div
        className={`rounded-xl bg-accent-primary/10 border border-accent-primary/25 text-accent-text flex items-center justify-center shrink-0 ${
          isSm ? 'w-7 h-7' : isLg ? 'w-10 h-10' : 'w-8 h-8'
        }`}
      >
        <Scale size={isSm ? 15 : isLg ? 22 : 18} />
      </div>

      {/* Brand Wordmark: DSS */}
      <div className="flex flex-col leading-none">
        <span
          className={`font-black tracking-wider uppercase text-text-primary ${
            isSm ? 'text-xs' : isLg ? 'text-lg' : 'text-sm'
          }`}
        >
          DSS
        </span>
        <span
          className={`font-mono tracking-widest text-text-muted uppercase hidden sm:block ${
            isSm ? 'text-[8px]' : 'text-[9px]'
          }`}
        >
          Decision Support System
        </span>
      </div>
    </div>
  );
}
