import { Project, ProjectCategory } from '@/types/project';

const STORAGE_KEY = 'yoqubkhoja_projects';
const SEED_KEY = 'yoqubkhoja_projects_seeded';

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export async function initializeProjects(): Promise<Project[]> {
  const existing = getProjects();
  if (existing.length > 0 || localStorage.getItem(SEED_KEY)) {
    return existing;
  }

  try {
    const res = await fetch('/api/projects');
    const seed: Project[] = await res.json();
    if (seed.length > 0) {
      saveProjects(seed);
      localStorage.setItem(SEED_KEY, '1');
      return seed;
    }
  } catch {
    // ignore
  }

  return existing;
}

export function addProject(
  project: Omit<Project, 'id' | 'createdAt' | 'icon'> & { icon?: string }
): Project {
  const projects = getProjects();
  const categoryIcons: Record<ProjectCategory, string> = {
    web: '🌐',
    app: '📱',
    tool: '🛠️',
    other: '📦',
  };

  const newProject: Project = {
    ...project,
    icon: project.icon || categoryIcons[project.category] || '📦',
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  projects.push(newProject);
  saveProjects(projects);
  return newProject;
}

export function updateProject(id: string, data: Partial<Project>): Project | null {
  const projects = getProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;
  projects[index] = { ...projects[index], ...data, id };
  saveProjects(projects);
  return projects[index];
}

export function removeProject(id: string) {
  saveProjects(getProjects().filter((p) => p.id !== id));
}
