'use client';

import { ALL_SECTION_SLUGS } from '@/lib/activity-directions';
import { Organization } from '@/types/organization';
import { PublicUser, UserPermissions, UserStatus } from '@/types/user';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useState } from 'react';

const SECTION_LABEL_KEYS: Record<string, string> = {
  overview: 'actOverview',
  staff: 'actStaff',
  finance: 'actFinance',
  legal: 'actLegal',
  'formation-report': 'actFormationReport',
  reports: 'actReports',
  news: 'actNews',
  reception: 'actReception',
  'sectoral-programs': 'actSectoralPrograms',
  'investment-projects': 'actInvestmentProjects',
  'central-press': 'actCentralPress',
  'list-of-enterprises': 'actListOfEnterprises',
  'list-of-services': 'actListOfServices',
  licensing: 'actLicensing',
  veterinary: 'actVeterinary',
  phytosanitary: 'actPhytosanitary',
  'plant-protection': 'actPlantProtection',
  'seed-production': 'actSeedProduction',
  'breeding-supervision': 'actBreedingSupervision',
  photogallery: 'actPhotogallery',
  magazine: 'actMagazine',
  videos: 'actVideos',
};

const STATUS_CLASS: Record<UserStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  approved: 'bg-green-500/20 text-green-400',
  denied: 'bg-red-500/20 text-red-400',
};

function emptyPermissions(): UserPermissions {
  return {
    canAccessProjects: true,
    organizationIds: [],
    sectionSlugs: ['overview'],
  };
}

function PermissionsEditor({
  permissions,
  organizations,
  onChange,
}: {
  permissions: UserPermissions;
  organizations: Organization[];
  onChange: (next: UserPermissions) => void;
}) {
  const t = useTranslations();

  function toggleOrg(orgId: string) {
    onChange({
      ...permissions,
      organizationIds: permissions.organizationIds.includes(orgId)
        ? permissions.organizationIds.filter((id) => id !== orgId)
        : [...permissions.organizationIds, orgId],
    });
  }

  function toggleSection(slug: string) {
    onChange({
      ...permissions,
      sectionSlugs: permissions.sectionSlugs.includes(slug)
        ? permissions.sectionSlugs.filter((item) => item !== slug)
        : [...permissions.sectionSlugs, slug],
    });
  }

  return (
    <>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={permissions.canAccessProjects}
          onChange={(e) =>
            onChange({ ...permissions, canAccessProjects: e.target.checked })
          }
        />
        {t('adminUsersAllowProjects')}
      </label>

      <div className="mb-4">
        <h4 className="mb-2 text-sm font-bold">{t('adminUsersPickOrganizations')}</h4>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] p-3">
          {organizations.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">{t('noOrganizations')}</p>
          ) : (
            organizations.map((org) => (
              <label key={org.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={permissions.organizationIds.includes(org.id)}
                  onChange={() => toggleOrg(org.id)}
                />
                <span>{org.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="mb-2">
        <h4 className="mb-2 text-sm font-bold">{t('adminUsersPickSections')}</h4>
        <div className="max-h-48 grid gap-2 overflow-y-auto rounded-lg border border-[var(--border)] p-3 sm:grid-cols-2">
          {ALL_SECTION_SLUGS.map((slug) => (
            <label key={slug} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={permissions.sectionSlugs.includes(slug)}
                onChange={() => toggleSection(slug)}
              />
              <span>{SECTION_LABEL_KEYS[slug] ? t(SECTION_LABEL_KEYS[slug]) : slug}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

export default function AdminUsersPanel() {
  const t = useTranslations();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftPermissions, setDraftPermissions] = useState<UserPermissions>(emptyPermissions());
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    status: 'approved' as UserStatus,
  });
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, orgsRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'same-origin' }),
        fetch('/api/organizations', { credentials: 'same-origin' }),
      ]);
      if (!usersRes.ok) throw new Error('users');
      setUsers((await usersRes.json()) as PublicUser[]);
      if (orgsRes.ok) {
        setOrganizations((await orgsRes.json()) as Organization[]);
      }
    } catch {
      setError(t('adminUsersLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateModal() {
    setCreateForm({
      username: '',
      password: '',
      confirmPassword: '',
      status: 'approved',
    });
    setDraftPermissions(emptyPermissions());
    setCreateError('');
    setCreateOpen(true);
  }

  async function updateStatus(user: PublicUser, status: UserStatus) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('update');
      await load();
    } catch {
      setError(t('adminUsersSaveError'));
    } finally {
      setSaving(false);
    }
  }

  function openPermissions(user: PublicUser) {
    setEditingUser(user);
    setDraftPermissions({ ...user.permissions });
  }

  async function savePermissions() {
    if (!editingUser) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: draftPermissions }),
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('save');
      setEditingUser(null);
      await load();
    } catch {
      setError(t('adminUsersSaveError'));
    } finally {
      setSaving(false);
    }
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setCreateError('');

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError(t('registerPasswordMismatch'));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: createForm.username.trim(),
          password: createForm.password,
          status: createForm.status,
          permissions: draftPermissions,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setCreateError(
          data.error === 'USERNAME_EXISTS'
            ? t('registerUsernameExists')
            : data.error === 'RESERVED_USERNAME'
              ? t('registerReservedUsername')
              : t('adminUsersCreateError')
        );
        return;
      }

      setCreateOpen(false);
      await load();
    } catch {
      setCreateError(t('adminUsersCreateError'));
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(user: PublicUser) {
    if (!confirm(t('adminUsersConfirmDelete', { username: user.username }))) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('delete');
      await load();
    } catch {
      setError(t('adminUsersSaveError'));
    } finally {
      setSaving(false);
    }
  }

  function statusLabel(status: UserStatus) {
    return {
      pending: t('adminUsersStatusPending'),
      approved: t('adminUsersStatusApproved'),
      denied: t('adminUsersStatusDenied'),
    }[status];
  }

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">{t('adminUsersLoading')}</div>;
  }

  return (
    <section className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="page-eyebrow">{t('adminUsersEyebrow')}</p>
            <h3 className="text-lg font-bold">{t('adminUsersTitle')}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t('adminUsersSubtitle')}</p>
          </div>
          <button type="button" onClick={openCreateModal} className="btn-primary shrink-0">
            + {t('adminUsersAdd')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)]/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <p className="text-[var(--text-muted)]">{t('adminUsersEmpty')}</p>
          <button type="button" onClick={openCreateModal} className="btn-primary mt-4">
            + {t('adminUsersAdd')}
          </button>
        </div>
      ) : (
        <div className="table-wrapper table-scroll-sm glass-card">
          <table>
            <thead>
              <tr>
                <th>{t('username')}</th>
                <th>{t('adminUsersStatus')}</th>
                <th>{t('adminUsersOrganizations')}</th>
                <th>{t('adminUsersSections')}</th>
                <th>{t('adminUsersActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-semibold">{user.username}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_CLASS[user.status]}`}
                    >
                      {statusLabel(user.status)}
                    </span>
                  </td>
                  <td>{user.permissions.organizationIds.length}</td>
                  <td>{user.permissions.sectionSlugs.length}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {user.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void updateStatus(user, 'approved')}
                          className="btn-primary px-2 py-1 text-[10px]"
                        >
                          {t('adminUsersApprove')}
                        </button>
                      )}
                      {user.status !== 'denied' && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void updateStatus(user, 'denied')}
                          className="btn-secondary px-2 py-1 text-[10px]"
                        >
                          {t('adminUsersDeny')}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => openPermissions(user)}
                        className="btn-secondary px-2 py-1 text-[10px]"
                      >
                        {t('adminUsersPermissions')}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void removeUser(user)}
                        className="rounded-lg border border-[var(--danger)] px-2 py-1 text-[10px] font-semibold text-[var(--danger)]"
                      >
                        {t('deleteProject')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setCreateOpen(false)}
        >
          <div className="modal-panel max-h-[90vh] max-w-2xl overflow-y-auto">
            <h3 className="mb-2 text-xl font-bold">{t('adminUsersAdd')}</h3>
            <p className="mb-4 text-sm text-[var(--text-muted)]">{t('adminUsersAddHint')}</p>

            {createError && (
              <div className="mb-4 rounded-lg border border-[var(--danger)]/40 bg-red-500/10 p-3 text-sm text-red-300">
                {createError}
              </div>
            )}

            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="field-label">{t('username')}</label>
                <input
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                  minLength={3}
                  pattern="[a-zA-Z0-9._-]+"
                  className="input-field"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('password')}</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                    minLength={6}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="field-label">{t('registerConfirmPassword')}</label>
                  <input
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, confirmPassword: e.target.value })
                    }
                    required
                    minLength={6}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="field-label">{t('adminUsersStatus')}</label>
                <select
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, status: e.target.value as UserStatus })
                  }
                  className="input-field"
                >
                  <option value="approved">{t('adminUsersStatusApproved')}</option>
                  <option value="pending">{t('adminUsersStatusPending')}</option>
                  <option value="denied">{t('adminUsersStatusDenied')}</option>
                </select>
              </div>

              <PermissionsEditor
                permissions={draftPermissions}
                organizations={organizations}
                onChange={setDraftPermissions}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? '...' : t('adminUsersAddSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setEditingUser(null)}
        >
          <div className="modal-panel max-h-[90vh] max-w-2xl overflow-y-auto">
            <h3 className="mb-2 text-xl font-bold">{t('adminUsersPermissions')}</h3>
            <p className="mb-4 text-sm text-[var(--text-muted)]">{editingUser.username}</p>

            <PermissionsEditor
              permissions={draftPermissions}
              organizations={organizations}
              onChange={setDraftPermissions}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void savePermissions()}
                className="btn-primary"
              >
                {saving ? '...' : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
