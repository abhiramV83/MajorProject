import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import BrandWordmark from '../components/BrandWordmark';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      {/* Background ambient smoke blooms */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full blur-[140px] opacity-25 dark:opacity-20 animate-pulse pointer-events-none"
          style={{ background: 'radial-gradient(circle, #0593C6 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[55vw] h-[55vw] rounded-full blur-[140px] opacity-25 dark:opacity-20 animate-pulse pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D83995 0%, transparent 70%)', animationDelay: '3s' }}
        />
        <div className="ribbed-glass-overlay pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <BrandWordmark size="lg" className="mb-8" />

        <div className="p-8 sm:p-12 max-w-lg w-full rounded-3xl glass-card border border-border-ui/40 dark:border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-bg-raised/80 dark:bg-white/5 text-text-muted flex items-center justify-center mx-auto mb-5 border border-border-ui/30 dark:border-white/10">
            <FileQuestion size={32} className="text-accent-text" />
          </div>

          <span className="text-xs font-mono font-bold text-accent-text tracking-widest uppercase block mb-1">
            DOCKET RECORD · 404
          </span>
          <h1 className="text-2xl font-black text-text-primary tracking-tight font-display">
            Court Record Not Found
          </h1>
          <p className="text-xs text-text-muted mt-2 leading-relaxed">
            The requested judicial docket, participant dossier, or decision evaluation does not exist or has been archived.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
            >
              <Home size={16} /> Return to Dashboard
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full border border-border-ui/40 dark:border-white/10 glass-pill hover:bg-bg-raised text-text-primary text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> Public Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
