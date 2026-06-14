'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

type OrganizationRegistryItem = {
  id: string;
  name: string;
  rma: string | null;
  sector: string | null;
  status: string | null;
};

export default function AdminOrganizationsRegistryPanel() {
  const t = useTranslations();
  const [organizations, setOrganizations] = useState<OrganizationRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/organizations', { credentials: 'same-origin' });
      if (!response.ok) {
        setError(t('adminOrgRegistryLoadError'));
        setOrganizations([]);
        return;
      }
      const data = (await response.json()) as { organizations: OrganizationRegistryItem[] };
      setOrganizations(data.organizations ?? []);
    } catch {
      setError(t('adminOrgRegistryLoadError'));
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q) ||
        org.rma?.toLowerCase().includes(q)
    );
  }, [organizations, search]);

  async function copyKey(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1800);
    } catch {
      setCopiedId(null);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">{t('adminOrgRegistryLoading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-eyebrow">{t('adminOrgRegistryEyebrow')}</p>
          <h3 className="text-lg font-bold">{t('adminOrgRegistryTitle')}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t('adminOrgRegistrySubtitle')}</p>
        </div>
        <button type="button" onClick={() => void loadOrganizations()} className="btn-secondary shrink-0">
          {t('adminOrgRegistryRefresh')}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="stat-card">
          <p className="text-xs text-[var(--text-muted)]">{t('adminOrgRegistryStatTotal')}</p>
          <p className="mt-1 text-2xl font-bold">{organizations.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-[var(--text-muted)]">{t('adminOrgRegistryStatShown')}</p>
          <p className="mt-1 text-2xl font-bold">{filtered.length}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)]/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('adminOrgRegistrySearchPlaceholder')}
        className="input-field max-w-xl"
      />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <p className="text-[var(--text-muted)]">{t('adminOrgRegistryEmpty')}</p>
        </div>
      ) : (
        <div className="table-wrapper table-scroll-sm glass-card">
          <table>
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>{t('adminOrgRegistryColName')}</th>
                <th>{t('adminOrgRegistryColKey')}</th>
                <th>{t('adminOrgRegistryColRma')}</th>
                <th>{t('adminOrgRegistryColActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org, index) => (
                <tr key={org.id}>
                  <td className="text-[var(--text-muted)]">{index + 1}</td>
                  <td className="min-w-[14rem] font-semibold">{org.name}</td>
                  <td>
                    <code className="rounded bg-[var(--bg-input)] px-2 py-1 text-[11px] text-[var(--text-muted)]">
                      {org.id}
                    </code>
                  </td>
                  <td className="font-mono text-xs">{org.rma ?? '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => void copyKey(org.id)}
                        className="btn-secondary px-2 py-1 text-[10px]"
                      >
                        {copiedId === org.id ? t('adminOrgRegistryCopied') : t('adminOrgRegistryCopyKey')}
                      </button>
                      <Link href={`/organizations/${org.id}`} className="btn-secondary px-2 py-1 text-[10px]">
                        {t('open')}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
