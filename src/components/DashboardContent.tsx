'use client';

import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { addProject, getProjects, initializeProjects, removeProject, updateProject } from '@/lib/projects';
import { Project, ProjectCategory, ProjectStatus } from '@/types/project';
import LangSwitcher from './LangSwitcher';
import Logo from './Logo';

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

export default function DashboardContent() {
  const t = useTranslations();
  const { data: session } = useSession();
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
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-card)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/yoqubkhoja1988"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)] sm:inline-flex"
            >
              {t('viewGithub')}
            </a>
            <LangSwitcher />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/tj/login' })}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--border)]"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <section className="hero-gradient mb-10 rounded-2xl border border-[var(--border)] p-8 md:p-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">
            {t('welcome')}, {session?.user?.name}
          </p>
          <h2 className="mb-2 text-3xl font-bold md:text-4xl">{t('heroTitle')}</h2>
          <p className="max-w-2xl text-[var(--text-muted)]">{t('heroSubtitle')}</p>
        </section>

        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: t('statsTotal'), value: stats.total, color: 'text-blue-400' },
            { label: t('statsActive'), value: stats.active, color: 'text-amber-400' },
            { label: t('statsDone'), value: stats.done, color: 'text-green-400' },
            { label: t('statsNew'), value: stats.new, color: 'text-violet-400' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent)]/50"
            >
              <p className="text-sm text-[var(--text-muted)]">{item.label}</p>
              <p className={`mt-1 text-3xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </section>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 outline-none focus:border-[var(--accent)] sm:max-w-xs"
          />
          <button
            type="button"
            onClick={() => openModal()}
            className="shrink-0 rounded-xl bg-[var(--accent)] px-5 py-2.5 font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          >
            + {t('addProject')}
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === key
                  ? 'bg-[var(--accent)] text-white'
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
          <div className="py-16 text-center text-[var(--text-muted)]">
            <div className="mb-4 text-5xl opacity-50">📂</div>
            <p>{t('noProjects')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <div className="mb-4 text-5xl opacity-50">🔍</div>
            <p>{t('noResults')}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <article
                key={project.id}
                className="card-hover flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-input)] text-2xl">
                    {project.icon || '📦'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-lg font-bold">{project.name}</h3>
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
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                    >
                      {t('open')}
                    </a>
                  )}
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
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
        <p>
          &copy; 2026 Yoqubkhoja Hub — {t('allRights')}
        </p>
        <a
          href="https://github.com/yoqubkhoja1988"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[var(--accent)] hover:underline"
        >
          github.com/yoqubkhoja1988
        </a>
      </footer>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-bold">
              {editingId ? t('editProject') : t('addProject')}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">
                  {t('projectName')}
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 outline-none focus:border-[var(--accent)]"
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
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
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
