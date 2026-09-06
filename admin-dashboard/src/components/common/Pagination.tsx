import type { PageMeta } from '@/types';

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, totalPages, total, limit } = meta;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3">
      <p className="text-[13px] text-slate-muted">
        {total === 0 ? 'No results' : `${rangeStart}–${rangeEnd} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary px-3 py-1.5 text-[13px]"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="text-[13px] text-slate-muted">
          Page {page} of {totalPages}
        </span>
        <button
          className="btn-secondary px-3 py-1.5 text-[13px]"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
