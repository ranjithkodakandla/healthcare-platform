'use client';

// A-12: User & Role Management — G9.
// Wired to GET /v1/admin/console-users + POST invite.
import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, ROLE_LABEL, type ConsoleUserRow, ApiError } from '@/lib/api';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';

const INVITE_ROLES = [
  'SUPPORT_AGENT',
  'PROVIDER_ONBOARDING_SPECIALIST',
  'TRUST_SAFETY_ANALYST',
  'COMPLIANCE_OFFICER',
  'CONSOLE_ADMINISTRATOR',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function formatRelative(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} hr ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
}

export default function UsersPage() {
  const [users, setUsers] = useState<ConsoleUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('SUPPORT_AGENT');
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [manageUser, setManageUser] = useState<ConsoleUserRow | null>(null);
  const [manageRole, setManageRole] = useState('SUPPORT_AGENT');
  const [manageBusy, setManageBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.users.list();
      setUsers(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        // request() redirects to /login
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load console users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openManage = (u: ConsoleUserRow) => {
    setManageUser(u);
    setManageRole(u.role);
    setError(null);
  };

  const saveManage = async () => {
    if (!manageUser) return;
    setManageBusy(true);
    setError(null);
    try {
      await adminApi.users.update(manageUser.id, { role: manageRole });
      setManageUser(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setManageBusy(false);
    }
  };

  const setUserStatus = async (status: 'ACTIVE' | 'DEACTIVATED') => {
    if (!manageUser) return;
    const ok = window.confirm(
      status === 'DEACTIVATED'
        ? `Deactivate ${manageUser.email}? They will lose console access.`
        : `Reactivate ${manageUser.email}?`,
    );
    if (!ok) return;
    setManageBusy(true);
    setError(null);
    try {
      await adminApi.users.update(manageUser.id, { status });
      setManageUser(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setManageBusy(false);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || inviting) return;
    if (!EMAIL_RE.test(email)) {
      setInviteFieldError('Enter a valid email address (e.g. staff@sahayak.health)');
      return;
    }
    setInviteFieldError(null);
    setInviting(true);
    try {
      await adminApi.users.create(email, inviteRole);
      setInviteOpen(false);
      setInviteEmail('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <TopBar
        title="User & Role Management"
        screenId="A-12"
        ref_="G9"
        slug="users"
        actions={
          <Button size="sm" onClick={() => setInviteOpen((v) => !v)}>
            Invite staff member
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}

      {manageUser && (
        <Card padding="md" className="mb-4">
          <div className="text-[13px] font-semibold text-[#1A1D1F] mb-1">Manage staff</div>
          <div className="text-[12px] text-[#7C8388] mb-3">{manageUser.email}</div>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="min-w-[220px]">
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1">Role</label>
              <select
                value={manageRole}
                onChange={(e) => setManageRole(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px] bg-white"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={() => void saveManage()} disabled={manageBusy}>
              Save role
            </Button>
            {(manageUser.status ?? 'ACTIVE') === 'ACTIVE' ? (
              <Button size="sm" variant="danger" onClick={() => void setUserStatus('DEACTIVATED')} disabled={manageBusy}>
                Deactivate
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => void setUserStatus('ACTIVE')} disabled={manageBusy}>
                Reactivate
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setManageUser(null)} disabled={manageBusy}>
              Close
            </Button>
          </div>
        </Card>
      )}

      {inviteOpen && (
        <Card padding="md" className="mb-4">
          <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Invite console staff</div>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1" htmlFor="invite-email">
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteFieldError(null);
                }}
                className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px]"
                placeholder="staff@sahayak.health"
                aria-invalid={Boolean(inviteFieldError)}
              />
              {inviteFieldError && (
                <div className="mt-1 text-[12px] text-[#C62E2E]" role="alert">
                  {inviteFieldError}
                </div>
              )}
            </div>
            <div className="min-w-[220px]">
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px] bg-white"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </Card>
      )}

      <Card padding="none">
        <ResponsiveTable><table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
              {['Staff member', 'Role', 'Status', 'MFA', 'Last active', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-[#7C8388]">Loading staff…</td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-[#7C8388]">
                  No console users yet. Invite the first staff member above.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const name = u.email.split('@')[0].replace(/[._]/g, ' ');
              const initials = name.split(' ').map((n) => n[0]?.toUpperCase() ?? '').slice(0, 2).join('');
              const linked = Boolean(u.firebaseUid);
              const deactivated = (u.status ?? 'ACTIVE') === 'DEACTIVATED';
              return (
                <tr key={u.id} className="border-b border-[#E7EBEC] bg-white last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#DEF3F5] flex items-center justify-center text-[11px] font-bold text-[#0B5C66]">
                        {initials || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-[#1A1D1F] capitalize">{name}</div>
                        <div className="text-[11px] text-[#7C8388]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#4A5054]">{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="px-5 py-3">
                    <Badge variant={deactivated ? 'danger' : linked ? 'success' : 'warning'}>
                      {deactivated ? 'Deactivated' : linked ? 'Active' : 'Invited'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={linked ? 'success' : 'warning'}>
                      {linked ? 'Enrolled' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-[#7C8388]">{formatRelative(u.updatedAt)}</td>
                  <td className="px-5 py-3">
                    <Button variant="outline" size="sm" onClick={() => openManage(u)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></ResponsiveTable>
      </Card>
    </>
  );
}
