export type ProjectStatus = 'new' | 'active' | 'done';

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  status: ProjectStatus;
  createdAt: string;
}
