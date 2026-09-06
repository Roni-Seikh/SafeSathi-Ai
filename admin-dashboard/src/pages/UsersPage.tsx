import { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import * as usersService from '@/services/users.service';
import type { AdminUser, PageMeta } from '@/types';
import { PageSpinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusPill } from '@/components/common/StatusPill';
import { Pagination } from '@/components/common/Pagination';
import { RoleGate } from '@/components/common/RoleGate';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/services/apiClient';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const LIMIT = 20;

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersService.listUsers({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
      });
      setUsers(res.users);
      setMeta(res.meta);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  async function toggleStatus(user: AdminUser) {
    setUpdatingId(user._id);
    try {
      await usersService.setUserStatus(user._id, !user.isActive);
      toast.success(`${user.name} ${user.isActive ? 'deactivated' : 'reactivated'}.`);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isActive: !u.isActive } : u)));
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-muted" />
        <input
          className="field-input pl-8"
          placeholder="Search name, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search term." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] uppercase tracking-wide text-slate-muted">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium">Language</th>
                  <th className="px-4 py-2.5 font-medium">Verified</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-2.5 font-medium text-ink-900">{user.name}</td>
                    <td className="px-4 py-2.5 text-slate-muted">
                      <div>{user.email}</div>
                      <div>{user.phone}</div>
                    </td>
                    <td className="px-4 py-2.5 uppercase text-slate-muted">{user.preferredLanguage}</td>
                    <td className="px-4 py-2.5">
                      {user.isEmailVerified || user.isPhoneVerified ? (
                        <StatusPill label="Verified" tone="green" />
                      ) : (
                        <StatusPill label="Unverified" tone="neutral" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-muted">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      {user.isActive ? (
                        <StatusPill label="Active" tone="green" />
                      ) : (
                        <StatusPill label="Deactivated" tone="red" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <RoleGate allow={['super_admin', 'moderator']} fallback={<span className="text-slate-muted">—</span>}>
                        <button
                          onClick={() => toggleStatus(user)}
                          disabled={updatingId === user._id}
                          className={
                            user.isActive
                              ? 'btn-secondary border-signal-red/40 px-3 py-1.5 text-[12.5px] text-signal-red hover:bg-signal-redDim'
                              : 'btn-secondary border-signal-green/40 px-3 py-1.5 text-[12.5px] text-signal-green hover:bg-signal-greenDim'
                          }
                        >
                          {user.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </RoleGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.total > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </div>
  );
}
