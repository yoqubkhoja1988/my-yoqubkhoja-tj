import { Organization } from '@/types/organization';

const STORAGE_KEY = 'yoqubkhoja_organizations';
const MIGRATED_KEY = 'yoqubkhoja_organizations_migrated';

function readLocalOrganizations(): Organization[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function clearLocalOrganizations() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('yoqubkhoja_organizations_seeded');
}

async function fetchOrganizations(): Promise<Organization[]> {
  const res = await fetch('/api/organizations');
  if (!res.ok) return [];
  return res.json();
}

async function migrateLocalToServer(): Promise<Organization[]> {
  const local = readLocalOrganizations();
  if (!local.length || localStorage.getItem(MIGRATED_KEY)) {
    return fetchOrganizations();
  }

  let migrated = true;
  for (const org of local) {
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(org),
    });
    if (!res.ok) migrated = false;
  }

  if (migrated) {
    clearLocalOrganizations();
    localStorage.setItem(MIGRATED_KEY, '1');
  }

  return fetchOrganizations();
}

export async function initializeOrganizations(): Promise<Organization[]> {
  const server = await fetchOrganizations();
  if (server.length > 0) {
    localStorage.setItem(MIGRATED_KEY, '1');
    return server;
  }

  return migrateLocalToServer();
}

export async function getOrganizations(): Promise<Organization[]> {
  return fetchOrganizations();
}

export async function addOrganization(
  organization: Omit<Organization, 'id' | 'createdAt'>
): Promise<Organization | null> {
  const res = await fetch('/api/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(organization),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function updateOrganization(
  id: string,
  data: Partial<Organization>
): Promise<Organization | null> {
  const res = await fetch(`/api/organizations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function removeOrganization(id: string): Promise<boolean> {
  const res = await fetch(`/api/organizations/${id}`, { method: 'DELETE' });
  return res.ok;
}
