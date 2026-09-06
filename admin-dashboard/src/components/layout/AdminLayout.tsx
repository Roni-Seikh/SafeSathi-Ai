import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastHost } from '@/components/common/ToastHost';

const TITLES: Record<string, string> = {
  '/': 'Overview',
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
      <div className="flex flex-1 flex-col">
        <Topbar title={resolveTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  );
}
