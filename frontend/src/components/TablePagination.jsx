import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TablePagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="px-4 sm:px-6 py-4 border-t border-border-ui/20 dark:border-border-ui/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-bg-surface/50 text-text-secondary select-none">
      <div className="font-mono tabular-nums text-text-muted text-center sm:text-left">
        Showing <strong className="text-text-primary">{startItem}</strong>–
        <strong className="text-text-primary">{endItem}</strong> of{' '}
        <strong className="text-text-primary">{totalItems}</strong> entries
      </div>

      <div className="flex items-center gap-2 font-mono">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full border border-border-ui/40 dark:border-border-ui/40 hover:bg-bg-raised text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-1 font-bold cursor-pointer"
        >
          <ChevronLeft size={16} /> <span className="hidden sm:inline">Prev</span>
        </button>

        <span className="min-h-[44px] px-4 py-2 rounded-full bg-bg-raised text-text-primary font-bold border border-border-ui/30 dark:border-border-ui/40 inline-flex items-center justify-center">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full border border-border-ui/40 dark:border-border-ui/40 hover:bg-bg-raised text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-1 font-bold cursor-pointer"
        >
          <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
