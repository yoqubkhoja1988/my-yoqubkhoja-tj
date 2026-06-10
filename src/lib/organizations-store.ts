import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { FOOD_SAFETY_CENTER_ID } from '@/lib/activity-directions';
import { ensureDatabaseReady, isDatabaseEnabled, sql } from '@/lib/db';
import { Organization } from '@/types/organization';

const FILE = join(process.cwd(), 'data', 'organizations.json');

const FALLBACK_ORGANIZATIONS: Organization[] = [
  {
    id: FOOD_SAFETY_CENTER_ID,
    name: 'МАРКАЗИ ТАЪМИНОТИ БЕХАТАРИИ ОЗУҚОВОРИИ НОҲИЯИ ҶАББОР РАСУЛОВ',
    description: '',
    createdAt: '2026-06-08T20:41:35.624Z',
    rma: '610001726',
    address: 'ноҳияи Ҷаббор Расулов',
    director: 'Маъмурҷонзода Саидаҳмад',
    chiefAccountant: 'Аҳроров Ёқубхоҷа Яҳёевич',
    directorPhone: '+992928861819',
    chiefAccountantPhone: '+992927917704',
    taxDistrict: 'ноҳияи Ҷаббор Расулов',
  },
];

function readOrganizationsFileSync(): Organization[] {
  try {
    const data = readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const list = Array.isArray(parsed) ? parsed : [];
    return list.length > 0 ? list : FALLBACK_ORGANIZATIONS;
  } catch {
    return FALLBACK_ORGANIZATIONS;
  }
}

function writeOrganizationsFileSync(organizations: Organization[]) {
  writeFileSync(FILE, `${JSON.stringify(organizations, null, 2)}\n`, 'utf-8');
}

function rowToOrganization(row: { id: string; payload: Organization | string }): Organization {
  const payload =
    typeof row.payload === 'string' ? (JSON.parse(row.payload) as Organization) : row.payload;
  return { ...payload, id: row.id };
}

export async function readOrganizationsFile(): Promise<Organization[]> {
  if (!isDatabaseEnabled()) {
    return readOrganizationsFileSync();
  }

  await ensureDatabaseReady();
  const { rows } = await sql<{ id: string; payload: Organization }>`
    SELECT id, payload FROM organizations ORDER BY created_at ASC
  `;

  const organizations = rows.map(rowToOrganization);
  return organizations.length > 0 ? organizations : FALLBACK_ORGANIZATIONS;
}

export async function writeOrganizationsFile(organizations: Organization[]): Promise<void> {
  if (!isDatabaseEnabled()) {
    writeOrganizationsFileSync(organizations);
    return;
  }

  await ensureDatabaseReady();
  await sql`DELETE FROM organizations`;
  for (const org of organizations) {
    await sql`
      INSERT INTO organizations (id, payload, created_at)
      VALUES (${org.id}, ${JSON.stringify(org)}::jsonb, ${org.createdAt})
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload
    `;
  }
}

export async function upsertOrganization(organization: Organization): Promise<Organization> {
  if (!isDatabaseEnabled()) {
    const organizations = readOrganizationsFileSync();
    const index = organizations.findIndex((item) => item.id === organization.id);
    if (index >= 0) organizations[index] = organization;
    else organizations.push(organization);
    writeOrganizationsFileSync(organizations);
    return organization;
  }

  await ensureDatabaseReady();
  await sql`
    INSERT INTO organizations (id, payload, created_at)
    VALUES (${organization.id}, ${JSON.stringify(organization)}::jsonb, ${organization.createdAt})
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload
  `;
  return organization;
}

export async function deleteOrganizationById(id: string): Promise<boolean> {
  if (!isDatabaseEnabled()) {
    const organizations = readOrganizationsFileSync();
    const filtered = organizations.filter((item) => item.id !== id);
    if (filtered.length === organizations.length) return false;
    writeOrganizationsFileSync(filtered);
    return true;
  }

  await ensureDatabaseReady();
  const result = await sql`DELETE FROM organizations WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}
