export type UserStatus = 'pending' | 'approved' | 'denied';

export interface UserPermissions {
  canAccessProjects: boolean;
  organizationIds: string[];
  sectionSlugs: string[];
}

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  status: UserStatus;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt?: string;
}

export type PublicUser = Omit<StoredUser, 'passwordHash'>;

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  canAccessProjects: true,
  organizationIds: [],
  sectionSlugs: ['overview'],
};
