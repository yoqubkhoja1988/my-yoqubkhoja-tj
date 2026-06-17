export type UserStatus = 'pending' | 'approved' | 'denied';

export interface UserPermissions {
  canAccessProjects: boolean;
  /** Маъмури ташкилот: ҳамаи бахшҳо ва таҳрир дар доираи ташкилот */
  organizationManager?: boolean;
  /** Танҳо назорат: ҳама бахшҳо намоиш дода мешавад, тағйирот мамнуъ */
  supervisionOnly?: boolean;
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
  supervisionOnly: false,
  organizationIds: [],
  sectionSlugs: ['overview'],
};

export function normalizeUserPermissions(value: unknown): UserPermissions {
  const raw =
    typeof value === 'string'
      ? (JSON.parse(value) as Partial<UserPermissions>)
      : ((value ?? {}) as Partial<UserPermissions>);

  return {
    canAccessProjects: raw.canAccessProjects ?? DEFAULT_USER_PERMISSIONS.canAccessProjects,
    organizationManager: raw.organizationManager ?? false,
    supervisionOnly: raw.supervisionOnly ?? false,
    organizationIds: Array.isArray(raw.organizationIds) ? raw.organizationIds : [],
    sectionSlugs:
      Array.isArray(raw.sectionSlugs) && raw.sectionSlugs.length > 0
        ? [...new Set(raw.sectionSlugs)]
        : ['overview'],
  };
}
