import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { dismissToast } from '@/store/toastSlice';

const ICONS = {
  success: <CheckCircle2 size={17} className="text-signal-green" />,
  error: <XCircle size={17} className="text-signal-red" />,
  info: <Info size={17} className="text-signal-blue" />,
};

export function ToastHost() {
  const toasts = useAppSelector((s) => s.toast.items);
  const dispatch = useAppDispatch();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-2.5 rounded-md border border-line bg-white px-3.5 py-3 shadow-lg"
        >
          {ICONS[t.tone]}
          <p className="flex-1 text-[13.5px] text-ink-900">{t.message}</p>
          <button
            onClick={() => dispatch(dismissToast(t.id))}
            className="text-slate-muted hover:text-ink-900"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
