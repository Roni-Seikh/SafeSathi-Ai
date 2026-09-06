import { useAppSelector } from '@/hooks/redux';
import type { AdminRole } from '@/types';

interface RoleGateProps {
  allow: AdminRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Hides admin-only actions (verify/reject, deactivate, recalculate) from
 * roles the backend would reject anyway — see requireAdminRole on the API. */
export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const role = useAppSelector((s) => s.auth.admin?.role);
  if (!role || !allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
