import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastHost } from '@/components/common/ToastHost';

const TITLES: Record<string, string> = {
  '/': 'Command Center',
  '/insights': 'AI Insights',
  '/sos': 'SOS monitor',
  '/reports': 'Reports',
  '/users': 'Users',
  '/heatmap': 'Risk zones',
  '/export': 'Export & reports',
};

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = '/' + pathname.split('/')[1];
  return TITLES[base] ?? 'SafeSathi Admin';
}

export function AdminLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={resolveTitle(location.pathname)} />
        {/* keyed on the path so every page change replays the entrance animation */}
        <main key={location.pathname} className="flex-1 overflow-y-auto p-6 animate-fade-up">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  );
}
