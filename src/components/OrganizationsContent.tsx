'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import {
  addOrganization,
  getOrganizations,
  initializeOrganizations,
  removeOrganization,
  updateOrganization,
} from '@/lib/organizations';
import {
  ORGANIZATION_SECTORS,
  OrganizationSectorGroupId,
  getOrganizationSectorMeta,
  groupOrganizationsBySector,
  inferOrganizationSector,
} from '@/lib/organization-sectors';
import { Organization, OrganizationSectorId } from '@/types/organization';
import AppFooter from './AppFooter';
import AppHeader from './AppHeader';

type SectorFilter = 'all' | OrganizationSectorGroupId;

type OrganizationForm = {
  sector: OrganizationSectorId | '';
  rma: string;
  ryam: string;
  name: string;
  address: string;
  director: string;
  chiefAccountant: string;
  directorPhone: string;
  chiefAccountantPhone: string;
  phone: string;
  taxDistrict: string;
  status: string;
  registeredAt: string;
  description: string;
};

const emptyForm: OrganizationForm = {
  sector: '',
  rma: '',
  ryam: '',
  name: '',
  address: '',
  director: '',
  chiefAccountant: '',
  directorPhone: '',
  chiefAccountantPhone: '',
  phone: '',
  taxDistrict: '',
  status: '',
  registeredAt: '',
  description: '',
};

function toForm(org: Organization): OrganizationForm {
  const inferredSector = inferOrganizationSector(org);
  return {
    sector:
      org.sector ?? (inferredSector !== 'uncategorized' ? inferredSector : ''),
    rma: org.rma || '',
    ryam: org.ryam || '',
    name: org.name,
    address: org.address || '',
    director: org.director || '',
    chiefAccountant: org.chiefAccountant || '',
    directorPhone: org.directorPhone || '',
    chiefAccountantPhone: org.chiefAccountantPhone || '',
    phone: org.phone || '',
    taxDistrict: org.taxDistrict || '',
    status: org.status || '',
    registeredAt: org.registeredAt || '',
    description: org.description || '',
  };
}

function cleanForm(form: OrganizationForm): Omit<Organization, 'id' | 'createdAt'> {
  const result: Omit<Organization, 'id' | 'createdAt'> = {
    name: form.name.trim(),
    description: form.description.trim(),
  };

  if (form.sector) {
    result.sector = form.sector;
  }

  const optionalFields = [
    'rma',
    'ryam',
    'address',
    'director',
    'chiefAccountant',
    'directorPhone',
    'chiefAccountantPhone',
    'phone',
    'taxDistrict',
    'status',
    'registeredAt',
  ] as const;

  optionalFields.forEach((key) => {
    const value = form[key]?.trim();
    if (value) result[key] = value;
  });

  return result;
}

export default function OrganizationsContent({ canManage = false }: { canManage?: boolean }) {
  const t = useTranslations();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [activeSector, setActiveSector] = useState<SectorFilter>('all');

  useEffect(() => {
    let cancelled = false;

    void initializeOrganizations()
      .then((data) => {
        if (cancelled) return;
        setOrganizations(data);
        if (data.length === 0) {
          setLoadError(t('orgLoadError'));
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('orgLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return organizations
      .filter(
        (org) =>
          !q ||
          org.name.toLowerCase().includes(q) ||
          org.description.toLowerCase().includes(q) ||
          org.rma?.includes(q) ||
          org.address?.toLowerCase().includes(q) ||
          org.director?.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'tg'));
  }, [organizations, search]);

  const grouped = useMemo(() => groupOrganizationsBySector(filtered), [filtered]);

  const visibleGroups = useMemo(() => {
    if (activeSector === 'all') return grouped;
    return grouped.filter((group) => group.id === activeSector);
  }, [activeSector, grouped]);

  const sectorFilters = useMemo(() => {
    const present = new Set(grouped.map((group) => group.id));
    const items: {
      id: OrganizationSectorGroupId;
      labelKey: string;
      count: number;
    }[] = ORGANIZATION_SECTORS.filter((sector) => present.has(sector.id)).map((sector) => ({
      id: sector.id,
      labelKey: sector.labelKey,
      count: grouped.find((group) => group.id === sector.id)?.organizations.length ?? 0,
    }));
    if (present.has('uncategorized')) {
      items.push({
        id: 'uncategorized',
        labelKey: 'orgSectorUncategorized',
        count: grouped.find((group) => group.id === 'uncategorized')?.organizations.length ?? 0,
      });
    }
    return items;
  }, [grouped]);

  async function refresh() {
    setOrganizations(await getOrganizations());
  }

  function openModal(id?: string) {
    setLookupError('');
    setSaveError('');
    if (id) {
      const org = organizations.find((item) => item.id === id);
      if (!org) return;
      setEditingId(id);
      setForm(toForm(org));
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setLookupError('');
  }

  async function lookupRma() {
    const rma = form.rma.trim();
    if (!rma) return;

    setLookupLoading(true);
    setLookupError('');

    try {
      const res = await fetch(`/api/andoz/lookup?rma=${encodeURIComponent(rma)}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) {
          setLookupError(t('orgLookupInvalidFormat'));
        } else if (res.status === 502) {
          setLookupError(t('orgLookupError'));
        } else {
          setLookupError(t('orgLookupNotFound'));
        }
        return;
      }

      setForm((prev) => ({
        ...prev,
        rma: data.rma || prev.rma,
        ryam: data.ryam || prev.ryam,
        name: data.name || prev.name,
        address: data.address || prev.address,
        director: data.director || prev.director,
        chiefAccountant: data.chiefAccountant || prev.chiefAccountant,
        directorPhone: data.directorPhone || prev.directorPhone,
        chiefAccountantPhone: data.chiefAccountantPhone || prev.chiefAccountantPhone,
        phone: data.phone || prev.phone,
        taxDistrict: data.taxDistrict || prev.taxDistrict,
        status: data.status || prev.status,
        registeredAt: data.registeredAt || prev.registeredAt,
      }));
    } catch {
      setLookupError(t('orgLookupError'));
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaveError('');
    const payload = cleanForm(form);

    const saved = editingId
      ? await updateOrganization(editingId, payload)
      : await addOrganization(payload);

    if (!saved) {
      setSaveError(t('sectionSaveError'));
      return;
    }

    await refresh();
    closeModal();
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDeleteOrganization'))) return;
    const deleted = await removeOrganization(id);
    if (!deleted) {
      setSaveError(t('sectionSaveError'));
      return;
    }
    await refresh();
  }

  return (
    <>
      <AppHeader />

      <main className="page-shell-wide animate-in">
        <section className="hero-gradient mb-5 rounded-xl p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-eyebrow">{t('navOrganizations')}</p>
              <h2 className="page-title mt-2">{t('orgTitle')}</h2>
              <p className="page-subtitle">{t('orgSubtitle')}</p>
            </div>
            {canManage && (
              <button type="button" onClick={() => openModal()} className="btn-primary shrink-0">
                + {t('addOrganization')}
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="stat-card min-w-[7rem] flex-1 sm:flex-none">
              <p className="text-[10px] text-[var(--text-muted)]">{t('orgStatsTotal')}</p>
              <p className="mt-0.5 text-xl font-bold text-[var(--accent)]">{organizations.length}</p>
            </div>
          </div>
        </section>

        <div className="mb-4 space-y-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('orgSearchPlaceholder')}
            className="input-field sm:max-w-md"
          />

          {!loading && organizations.length > 0 && sectorFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSector('all')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeSector === 'all'
                    ? 'bg-gradient-to-r from-[var(--accent)] to-indigo-500 text-white shadow-md shadow-blue-500/20'
                    : 'border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {t('orgSectorFilterAll')}
              </button>
              {sectorFilters.map((sector) => (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => setActiveSector(sector.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    activeSector === sector.id
                      ? 'bg-gradient-to-r from-[var(--accent)] to-indigo-500 text-white shadow-md shadow-blue-500/20'
                      : 'border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {t(sector.labelKey)} ({sector.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {loadError && !loading && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {loadError}
          </p>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[var(--accent)]/30" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <p className="text-[var(--text-muted)]">{t('noOrganizations')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p className="text-[var(--text-muted)]">{t('noResults')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((group) => {
              const meta = getOrganizationSectorMeta(group.id);
              if (!meta) return null;

              return (
                <section
                  key={group.id}
                  id={`org-sector-${group.id}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/40 p-4 md:p-5"
                >
                  <header className="mb-4 border-b border-[var(--border)] pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold md:text-lg">
                          <span className="mr-1.5">{meta.icon}</span>
                          {t(meta.labelKey)}
                        </h3>
                        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)] md:text-sm">
                          {t(meta.descKey)}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                        {t('orgSectorCount', { count: group.organizations.length })}
                      </span>
                    </div>
                  </header>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.organizations.map((org) => {
                      const sectorId = inferOrganizationSector(org);
                      const sectorMeta = getOrganizationSectorMeta(sectorId);

                      return (
                        <article
                          key={org.id}
                          className="glass-card glass-card-hover flex flex-col p-4"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-emerald-500/10 text-lg">
                              {sectorMeta?.icon ?? '🏛️'}
                            </div>
                            {org.rma && (
                              <span className="rounded-lg bg-[var(--bg-input)] px-2.5 py-1 font-mono text-xs text-[var(--text-muted)]">
                                {org.rma}
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/organizations/${org.id}/overview`}
                            className="text-sm font-bold leading-snug transition hover:text-[var(--accent)]"
                          >
                            {org.name}
                          </Link>

                          {sectorMeta && (
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                              {t(sectorMeta.labelKey)}
                            </p>
                          )}

                          {(org.address || org.director) && (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                              {[org.address, org.director].filter(Boolean).join(' · ')}
                            </p>
                          )}

                          <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
                            <Link href={`/organizations/${org.id}`} className="btn-primary px-3 py-1.5 text-xs">
                              {t('orgOpen')}
                            </Link>
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openModal(org.id)}
                                  className="btn-secondary px-3 py-1.5 text-xs"
                                >
                                  {t('editOrganization')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(org.id)}
                                  className="btn-danger"
                                >
                                  {t('deleteOrganization')}
                                </button>
                              </>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <AppFooter />

      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-panel max-w-lg">
            <h3 className="mb-6 text-xl font-bold">
              {editingId ? t('editOrganization') : t('addOrganization')}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="field-label">{t('organizationRma')}</label>
                <div className="flex gap-2">
                  <input
                    value={form.rma}
                    onChange={(e) => setForm({ ...form, rma: e.target.value.replace(/\D/g, '') })}
                    onBlur={() => !editingId && form.rma.length >= 9 && lookupRma()}
                    placeholder={t('organizationRmaPlaceholder')}
                    className="input-field font-mono"
                  />
                  <button
                    type="button"
                    onClick={lookupRma}
                    disabled={lookupLoading || form.rma.length < 9}
                    className="btn-primary shrink-0 disabled:opacity-50"
                  >
                    {lookupLoading ? '...' : t('orgLookup')}
                  </button>
                </div>
                {lookupError && (
                  <p className="mt-1 text-sm text-[var(--danger)]">{lookupError}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('organizationRyam')}</label>
                  <input
                    value={form.ryam}
                    onChange={(e) => setForm({ ...form, ryam: e.target.value })}
                    placeholder={t('organizationRyamPlaceholder')}
                    className="input-field font-mono"
                  />
                </div>
                <div>
                  <label className="field-label">{t('organizationStatus')}</label>
                  <input
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    readOnly
                    className="input-field opacity-70"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">{t('organizationSector')}</label>
                <select
                  value={form.sector}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sector: e.target.value as OrganizationSectorId | '',
                    })
                  }
                  className="input-field"
                >
                  <option value="">{t('organizationSectorPlaceholder')}</option>
                  {ORGANIZATION_SECTORS.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.icon} {t(sector.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">{t('organizationName')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder={t('organizationNamePlaceholder')}
                  className="input-field"
                />
              </div>

              <div>
                <label className="field-label">{t('organizationAddress')}</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t('organizationAddressPlaceholder')}
                  className="input-field"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('organizationDirector')}</label>
                  <input
                    value={form.director}
                    onChange={(e) => setForm({ ...form, director: e.target.value })}
                    placeholder={t('organizationDirectorPlaceholder')}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="field-label">{t('organizationChiefAccountant')}</label>
                  <input
                    value={form.chiefAccountant}
                    onChange={(e) => setForm({ ...form, chiefAccountant: e.target.value })}
                    placeholder={t('organizationChiefAccountantPlaceholder')}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('organizationDirectorPhone')}</label>
                  <input
                    value={form.directorPhone}
                    onChange={(e) => setForm({ ...form, directorPhone: e.target.value })}
                    placeholder={t('organizationPhonePlaceholder')}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="field-label">{t('organizationChiefAccountantPhone')}</label>
                  <input
                    value={form.chiefAccountantPhone}
                    onChange={(e) => setForm({ ...form, chiefAccountantPhone: e.target.value })}
                    placeholder={t('organizationPhonePlaceholder')}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">{t('organizationDesc')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder={t('organizationDescPlaceholder')}
                  className="input-field resize-none"
                />
              </div>

              {saveError && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {saveError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
