import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 bg-paper text-center">
      <p className="font-display text-[40px] font-semibold text-ink-900">404</p>
      <p className="text-[14px] text-slate-muted">This page doesn't exist in the console.</p>
      <Link to="/" className="btn-primary mt-3">
        Back to overview
      </Link>
    </div>
  );
}
