import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Siren,
  FileWarning,
  Users,
  Map,
  Download,
  ShieldHalf,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/sos', label: 'SOS monitor', icon: Siren, end: false },
  { to: '/reports', label: 'Reports', icon: FileWarning, end: false },
  { to: '/users', label: 'Users', icon: Users, end: false },
  { to: '/heatmap', label: 'Risk zones', icon: Map, end: false },
  { to: '/export', label: 'Export & reports', icon: Download, end: false },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col bg-ink-800 text-white/90">
      <div className="flex items-center gap-2 px-5 py-5">
        <ShieldHalf size={22} className="text-signal-red" />
        <div>
          <p className="font-display text-[15px] font-semibold leading-tight text-white">SafeSathi</p>
          <p className="text-[11px] tracking-wide text-white/50">Command Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] transition-colors ${
                isActive ? 'bg-white/10 text-white font-medium' : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 text-[11px] text-white/35">SafeSathi Admin · v0.7</div>
    </aside>
  );
}
