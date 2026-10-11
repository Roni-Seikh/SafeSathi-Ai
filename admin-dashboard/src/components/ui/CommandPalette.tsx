import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, Siren, FileWarning, Users, Map, Download, Sparkles, Moon, CornerDownLeft } from 'lucide-react';
import { useTheme } from '@/lib/theme';

interface Cmd { id: string; label: string; hint: string; icon: JSX.Element; run: () => void }

/** Ctrl/⌘+K — jump anywhere or toggle the theme from the keyboard. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [, toggleTheme] = useTheme();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const cmds: Cmd[] = useMemo(() => [
    { id: 'home', label: 'Command Center', hint: 'Overview & live risk', icon: <LayoutGrid size={16} />, run: () => nav('/') },
    { id: 'insights', label: 'AI Insights', hint: 'Forecast, anomalies, detector quality', icon: <Sparkles size={16} />, run: () => nav('/insights') },
    { id: 'sos', label: 'SOS monitor', hint: 'Live events & evidence vault', icon: <Siren size={16} />, run: () => nav('/sos') },
    { id: 'reports', label: 'Reports', hint: 'Moderate incident reports', icon: <FileWarning size={16} />, run: () => nav('/reports') },
    { id: 'users', label: 'Users', hint: 'Manage accounts', icon: <Users size={16} />, run: () => nav('/users') },
    { id: 'heatmap', label: 'Risk zones', hint: 'Map of hotspots', icon: <Map size={16} />, run: () => nav('/heatmap') },
    { id: 'export', label: 'Export & reports', hint: 'CSV & monthly summary', icon: <Download size={16} />, run: () => nav('/export') },
    { id: 'theme', label: 'Toggle dark / light theme', hint: 'Appearance', icon: <Moon size={16} />, run: toggleTheme },
  ], [nav, toggleTheme]);

  const list = cmds.filter((c) => (c.label + c.hint).toLowerCase().includes(q.toLowerCase()));
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);
  useEffect(() => setI(0), [q]);
  if (!open) return null;

  const go = (c?: Cmd) => { if (c) { c.run(); onClose(); } };
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ink-900/50 p-4 pt-[14vh] backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-white shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={16} className="text-slate-muted" />
          <input
            ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to…"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(list.length - 1, x + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
              if (e.key === 'Enter') go(list[i]);
            }}
            className="h-12 flex-1 bg-transparent text-[14.5px] text-ink-900 outline-none placeholder:text-slate-muted"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[11px] text-slate-muted">esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {list.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-slate-muted">No match</li>}
          {list.map((c, idx) => (
            <li key={c.id}>
              <button onMouseEnter={() => setI(idx)} onClick={() => go(c)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${idx === i ? 'bg-accent-soft text-accent dark:bg-accent/20' : 'text-ink-900'}`}>
                <span className="opacity-80">{c.icon}</span>
                <span className="flex-1"><span className="block text-[13.5px] font-medium">{c.label}</span><span className="block text-[11.5px] text-slate-muted">{c.hint}</span></span>
                {idx === i && <CornerDownLeft size={14} />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
