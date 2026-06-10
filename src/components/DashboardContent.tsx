'use client';

import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { addProject, getProjects, initializeProjects, removeProject, updateProject } from '@/lib/projects';
import { Project, ProjectCategory, ProjectStatus } from '@/types/project';
import AdminDataPanel from './AdminDataPanel';
import AdminUsersPanel from './AdminUsersPanel';
import AppFooter from './AppFooter';
import AppHeader from './AppHeader';

type DashboardTab = 'projects' | 'admin';
type AdminSubTab = 'users' | 'data';

const statusClass: Record<ProjectStatus, string> = {
  active: 'bg-amber-500/20 text-amber-400',
  done: 'bg-green-500/20 text-green-400',
  new: 'bg-blue-500/20 text-blue-400',
};

const emptyForm = {
  name: '',
  description: '',
  url: '',
  status: 'new' as ProjectStatus,
  category: 'web' as ProjectCategory,
  icon: '',
};

export default function DashboardContent({
  isAdmin = false,
  canAccessProjects = true,
}: {
  isAdmin?: boolean;
  canAccessProjects?: boolean;
  canAccessOrganizations?: boolean;
}) {
  const t = useTranslations();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<DashboardTab>(canAccessProjects ? 'projects' : 'admin');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('users');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    initializeProjects().then((data) => {
      setProjects(data.length ? data : getProjects());
      setLoading(false);
    });
  }, []);

  const stats = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      done: projects.filter((p) => p.status === 'done').length,
      new: projects.filter((p) => p.status === 'new').length,
    }),
    [projects]
  );

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesFilter = filter === 'all' || p.status === filter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [projects, search, filter]);

  function refresh() {
    setProjects(getProjects());
  }

  function openModal(id?: string) {
    if (id) {
      const project = projects.find((p) => p.id === id);
      if (!project) return;
      setEditingId(id);
      setForm({
        name: project.name,
        description: project.description,
        url: project.url,
        status: project.status,
        category: project.category || 'web',
        icon: project.icon || '',
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      updateProject(editingId, form);
    } else {
      addProject(form);
    }

    refresh();
    closeModal();
  }

  function handleDelete(id: string) {
    if (confirm(t('confirmDelete'))) {
      removeProject(id);
      refresh();
    }
  }

  function statusLabel(status: ProjectStatus) {
    return { active: t('statusActive'), done: t('statusDone'), new: t('statusNew') }[status];
  }

  function categoryLabel(category: ProjectCategory) {
    return {
      web: t('categoryWeb'),
      app: t('categoryApp'),
      tool: t('categoryTool'),
      other: t('categoryOther'),
    }[category];
  }

  const filters: { key: ProjectStatus | 'all'; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'active', label: t('statusActive') },
    { key: 'done', label: t('statusDone') },
    { key: 'new', label: t('statusNew') },
  ];

  return (
    <>
      <AppHeader />

      <main className="page-shell animate-in">
        <section className="hero-gradient mb-5 rounded-xl p-5 md:p-6">
          <p className="page-eyebrow">
            {t('welcome')}, {session?.user?.name}
          </p>
          <h2 className="page-title mt-1.5">{t('heroTitle')}</h2>
          <p className="page-subtitle">{t('heroSubtitle')}</p>
        </section>

        {isAdmin && (
          <div className="mb-5 flex flex-wrap gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-1">
            {canAccessProjects && (
              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'projects'
                    ? 'bg-[var(--accent)]/20 text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]'
                }`}
              >
                {t('navProjects')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'admin'
                  ? 'bg-[var(--accent)]/20 text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
            >
              🛡 {t('adminDataTab')}
            </button>
          </div>
        )}

        {activeTab === 'admin' && isAdmin ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAdminSubTab('users')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  adminSubTab === 'users'
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                {t('adminUsersTab')}
              </button>
              <button
                type="button"
                onClick={() => setAdminSubTab('data')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  adminSubTab === 'data'
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                {t('adminDataTab')}
              </button>
            </div>
            {adminSubTab === 'users' ? <AdminUsersPanel /> : <AdminDataPanel />}
          </div>
        ) : !canAccessProjects ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <p className="text-[var(--text-muted)]">{t('accessProjectsDenied')}</p>
          </div>
        ) : (
          <>
        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: t('statsTotal'), value: stats.total, color: 'text-blue-400' },
            { label: t('statsActive'), value: stats.active, color: 'text-amber-400' },
            { label: t('statsDone'), value: stats.done, color: 'text-green-400' },
            { label: t('statsNew'), value: stats.new, color: 'text-violet-400' },
          ].map((item) => (
            <div key={item.label} className="stat-card">
              <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
              <p className={`mt-0.5 text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </section>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="input-field sm:max-w-xs"
          />
          {isAdmin && (
            <button type="button" onClick={() => openModal()} className="btn-primary shrink-0">
              + {t('addProject')}
            </button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === key
                  ? 'bg-gradient-to-r from-[var(--accent)] to-indigo-500 text-white shadow-md shadow-blue-500/20'
                  : 'border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-[var(--text-muted)]">...</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <p className="text-[var(--text-muted)]">{t('noProjects')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p className="text-[var(--text-muted)]">{t('noResults')}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <article
                key={project.id}
                className="glass-card glass-card-hover flex flex-col gap-2 p-4"
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-input)] text-lg">
                    {project.icon || '📦'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-bold">{project.name}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass[project.status]}`}
                      >
                        {statusLabel(project.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--accent)]">
                      {categoryLabel(project.category || 'other')}
                    </p>
                  </div>
                </div>
                <p className="flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  {project.description || '—'}
                </p>
                <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                  {isAdmin && project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                    >
                      {t('open')}
                    </a>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => openModal(project.id)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--border)]"
                      >
                        {t('editProject')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id)}
                        className="rounded-lg border border-[var(--danger)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
                      >
                        {t('deleteProject')}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
          </>
        )}
      </main>

      <AppFooter />

      {isAdmin && modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-panel max-w-md">
            <h3 className="mb-6 text-xl font-bold">
              {editingId ? t('editProject') : t('addProject')}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="field-label">{t('projectName')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">
                  {t('projectDesc')}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">
                  {t('projectUrl')}
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">
                    {t('projectStatus')}
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 outline-none focus:border-[var(--accent)]"
                  >
                    <option value="new">{t('statusNew')}</option>
                    <option value="active">{t('statusActive')}</option>
                    <option value="done">{t('statusDone')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">
                    {t('projectCategory')}
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ProjectCategory })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 outline-none focus:border-[var(--accent)]"
                  >
                    <option value="web">{t('categoryWeb')}</option>
                    <option value="app">{t('categoryApp')}</option>
                    <option value="tool">{t('categoryTool')}</option>
                    <option value="other">{t('categoryOther')}</option>
                  </select>
                </div>
              </div>
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
