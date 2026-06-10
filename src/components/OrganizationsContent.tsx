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
import { Organization } from '@/types/organization';
import AppFooter from './AppFooter';
import AppHeader from './AppHeader';

type OrganizationForm = {
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
  return {
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

  const optionalFields: (keyof OrganizationForm)[] = [
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
  ];

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

  useEffect(() => {
    initializeOrganizations().then((data) => {
      setOrganizations(data);
      setLoading(false);
    });
  }, []);

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

        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('orgSearchPlaceholder')}
            className="input-field sm:max-w-md"
          />
        </div>

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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((org) => (
              <article
                key={org.id}
                className="glass-card glass-card-hover flex flex-col p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-emerald-500/10 text-lg">
                    🏛️
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
                      <button type="button" onClick={() => openModal(org.id)} className="btn-secondary px-3 py-1.5 text-xs">
                        {t('editOrganization')}
                      </button>
                      <button type="button" onClick={() => handleDelete(org.id)} className="btn-danger">
                        {t('deleteOrganization')}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
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
