export type ProjectStatus = 'new' | 'active' | 'done';
export type ProjectCategory = 'web' | 'app' | 'tool' | 'other';

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  status: ProjectStatus;
  category: ProjectCategory;
  icon: string;
  createdAt: string;
}
