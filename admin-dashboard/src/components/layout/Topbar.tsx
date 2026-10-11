import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, Sun, Moon, Bell } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { clearSession } from '@/store/authSlice';
import { ROLE_LABEL } from '@/constants';
import { useTheme } from '@/lib/theme';
import { useActiveSOSCount } from '@/lib/liveSOS';
import { CommandPalette } from '@/components/ui/CommandPalette';

export function Topbar({ title }: { title: string }) {
  const admin = useAppSelector((s) => s.auth.admin);
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const [theme, toggleTheme] = useTheme();
  const active = useActiveSOSCount();
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line px-6 backdrop-blur-md topbar">
        <h1 className="font-display text-[19px] font-semibold text-ink-900">{title}</h1>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setPalette(true)} className="hidden items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-[13px] text-slate-muted transition-colors hover:border-accent hover:text-ink-900 md:flex">
            <Search size={14} /> Search or jump to… <kbd className="ml-3 rounded border border-line px-1.5 text-[11px]">Ctrl K</kbd>
          </button>
          <button onClick={() => nav('/sos')} className="relative rounded-lg border border-line p-2 text-slate-muted transition-colors hover:text-ink-900" aria-label={`${active} active SOS`}>
            <Bell size={16} className={active > 0 ? 'animate-pulse text-signal-red' : ''} />
            {active > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal-red px-1 text-[10px] font-bold text-white">{active}</span>}
          </button>
          <button onClick={toggleTheme} className="rounded-lg border border-line p-2 text-slate-muted transition-all hover:rotate-12 hover:text-ink-900" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {admin && (
            <div className="ml-1 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-signal-blue font-display text-[14px] font-semibold text-white">{admin.name.charAt(0).toUpperCase()}</div>
              <div className="hidden text-right sm:block">
                <p className="text-[13px] font-medium leading-tight text-ink-900">{admin.name}</p>
                <p className="text-[11.5px] text-slate-muted">{ROLE_LABEL[admin.role] ?? admin.role}</p>
              </div>
            </div>
          )}
          <button onClick={() => dispatch(clearSession())} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-slate-muted transition-colors hover:bg-paper hover:text-ink-900">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </>
  );
}
