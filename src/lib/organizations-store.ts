import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { FOOD_SAFETY_CENTER_ID, KINDERGARTEN_SCHOOL_ID } from '@/lib/activity-directions';
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
    sector: 'agriculture-food',
  },
  {
    id: KINDERGARTEN_SCHOOL_ID,
    name: 'МУАССИСАИ ДАВЛАТИИ ТАЪЛИМИИ ТОМАКТАБИИ МАКТАБ- КӮДАКИСТОНИ №1 НОҲИЯИ ҶАББОР РАСУЛОВ',
    description: '',
    createdAt: '2026-06-11T00:00:00.000Z',
    rma: '610007948',
    ryam: '6110004359',
    address: 'шаҳраки Меҳробод, кӯчаи Ленин',
    director: 'Шокирова Нилуфар Ҳасановна',
    chiefAccountant: 'Ахроров Ёқубхоҷа Яҳёевич',
    directorPhone: '+992929363080',
    chiefAccountantPhone: '+992927917704',
    taxDistrict: 'ноҳияи Ҷаббор Расулов',
    status: 'Амалкунанда',
    sector: 'education',
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

/** Upserts each organization without deleting others missing from the array. */
export async function writeOrganizationsFile(organizations: Organization[]): Promise<void> {
  for (const org of organizations) {
    await upsertOrganization(org);
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

  const fileOrgs = readOrganizationsFileSync();
  const index = fileOrgs.findIndex((item) => item.id === organization.id);
  if (index >= 0) fileOrgs[index] = organization;
  else fileOrgs.push(organization);
  writeOrganizationsFileSync(fileOrgs);

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
  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted) {
    const fileOrgs = readOrganizationsFileSync().filter((item) => item.id !== id);
    writeOrganizationsFileSync(fileOrgs);
  }
  return deleted;
}
