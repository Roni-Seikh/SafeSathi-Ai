import { LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { clearSession } from '@/store/authSlice';
import { ROLE_LABEL } from '@/constants';

export function Topbar({ title }: { title: string }) {
  const admin = useAppSelector((s) => s.auth.admin);
  const dispatch = useAppDispatch();

  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-white px-6">
      <h1 className="font-display text-[19px] font-semibold text-ink-900">{title}</h1>
      <div className="flex items-center gap-4">
        {admin && (
          <div className="text-right">
            <p className="text-[13px] font-medium text-ink-900">{admin.name}</p>
            <p className="text-[11.5px] text-slate-muted">{ROLE_LABEL[admin.role] ?? admin.role}</p>
          </div>
        )}
        <button
          onClick={() => dispatch(clearSession())}
          className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[13px] text-slate-muted hover:bg-paper hover:text-ink-900"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </header>
  );
}
