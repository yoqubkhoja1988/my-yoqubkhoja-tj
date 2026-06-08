'use client';

import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { addProject, getProjects, removeProject, updateProject } from '@/lib/projects';
import { Project, ProjectStatus } from '@/types/project';
import LangSwitcher from './LangSwitcher';
import Logo from './Logo';

const statusClass: Record<ProjectStatus, string> = {
  active: 'bg-amber-500/20 text-amber-400',
  done: 'bg-green-500/20 text-green-400',
  new: 'bg-blue-500/20 text-blue-400',
};

export default function DashboardContent() {
  const t = useTranslations();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    url: '',
    status: 'new' as ProjectStatus,
  });

  useEffect(() => {
    setProjects(getProjects());
  }, []);

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
      });
    } else {
      setEditingId(null);
      setForm({ name: '', description: '', url: '', status: 'new' });
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

    setProjects(getProjects());
    closeModal();
  }

  function handleDelete(id: string) {
    if (confirm(t('confirmDelete'))) {
      removeProject(id);
      setProjects(getProjects());
    }
  }

  function statusLabel(status: ProjectStatus) {
    const map = {
      active: t('statusActive'),
      done: t('statusDone'),
      new: t('statusNew'),
    };
    return map[status];
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-card)]/80 px-4 py-4 backdrop-blur-md md:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/tj/login' })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--border)]"
          >
            {t('logout')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <h2 className="mb-1 text-3xl font-bold">{t('dashboard')}</h2>
        <p className="mb-8 text-[var(--text-muted)]">
          {t('welcome')}, {session?.user?.name}!
        </p>

        <div className="mb-8 flex justify-end">
          <button
            type="button"
            onClick={() => openModal()}
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          >
            + {t('addProject')}
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <div className="mb-4 text-5xl opacity-50">📂</div>
            <p>{t('noProjects')}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">{project.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass[project.status]}`}
                  >
                    {statusLabel(project.status)}
                  </span>
                </div>
                <p className="flex-1 text-sm text-[var(--text-muted)]">
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
        &copy; 2026 Yoqubkhoja Hub — {t('allRights')}
      </footer>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl">
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
