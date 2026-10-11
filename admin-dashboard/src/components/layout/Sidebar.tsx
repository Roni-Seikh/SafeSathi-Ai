import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Siren, FileWarning, Users, Map, Download, ShieldHalf, Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useActiveSOSCount } from '@/lib/liveSOS';
import { PulseDot } from '@/components/ui/primitives';

const NAV = [
  { section: 'Monitor', items: [
    { to: '/', label: 'Command Center', icon: LayoutGrid, end: true },
    { to: '/sos', label: 'SOS monitor', icon: Siren, end: false, live: true },
    { to: '/heatmap', label: 'Risk zones', icon: Map, end: false },
  ] },
  { section: 'Intelligence', items: [{ to: '/insights', label: 'AI Insights', icon: Sparkles, end: false }] },
  { section: 'Manage', items: [
    { to: '/reports', label: 'Reports', icon: FileWarning, end: false },
    { to: '/users', label: 'Users', icon: Users, end: false },
    { to: '/export', label: 'Export & reports', icon: Download, end: false },
  ] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('safesathi_sidebar') === '1');
  const active = useActiveSOSCount();
  const toggle = () => setCollapsed((c) => { localStorage.setItem('safesathi_sidebar', c ? '0' : '1'); return !c; });

  return (
    <aside className={`sticky top-0 flex h-screen shrink-0 flex-col bg-gradient-to-b from-ink-800 to-ink-900 text-white/90 transition-[width] duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      <div className={`flex items-center gap-2.5 py-5 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-signal-red shadow-glow">
          <ShieldHalf size={19} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="font-display text-[15px] font-semibold leading-tight text-white">SafeSathi</p>
            <p className="text-[11px] tracking-wide text-white/50">Command Console</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {NAV.map((g) => (
          <div key={g.section}>
            {!collapsed && <p className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[.14em] text-white/30">{g.section}</p>}
            <div className="space-y-0.5">
              {g.items.map(({ to, label, icon: Icon, end, ...rest }) => (
                <NavLink
                  key={to} to={to} end={end} title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-lg py-2 text-[13.5px] transition-all duration-200 ${collapsed ? 'justify-center px-0' : 'px-3'} ${
                      isActive ? 'bg-white/12 font-medium text-white shadow-inner' : 'text-white/65 hover:translate-x-0.5 hover:bg-white/6 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent-glow" />}
                      <Icon size={17} strokeWidth={1.8} className="transition-transform duration-200 group-hover:scale-110" />
                      {!collapsed && <span className="flex-1">{label}</span>}
                      {'live' in rest && active > 0 && (
                        <span className={`flex items-center gap-1.5 rounded-full bg-signal-red px-1.5 py-0.5 text-[10.5px] font-bold text-white ${collapsed ? 'absolute right-2 top-1' : ''}`}>
                          <PulseDot color="#fff" size={5} />{active}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button onClick={toggle} className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg py-2 text-[12px] text-white/40 transition-colors hover:bg-white/6 hover:text-white" aria-label="Toggle sidebar">
        {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} />Collapse</>}
      </button>
      {!collapsed && <div className="px-5 pb-4 text-[11px] text-white/30">SafeSathi Admin · v2.0</div>}
    </aside>
  );
}
