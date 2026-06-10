import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { FOOD_SAFETY_CENTER_ID } from '@/lib/activity-directions';
import { Organization } from '@/types/organization';

const FILE = join(process.cwd(), 'data', 'organizations.json');

/** Fallback when data file is missing (e.g. before first deploy with data/ in git). */
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

export function readOrganizationsFile(): Organization[] {
  try {
    const data = readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const list = Array.isArray(parsed) ? parsed : [];
    return list.length > 0 ? list : FALLBACK_ORGANIZATIONS;
  } catch {
    return FALLBACK_ORGANIZATIONS;
  }
}

export function writeOrganizationsFile(organizations: Organization[]) {
  writeFileSync(FILE, `${JSON.stringify(organizations, null, 2)}\n`, 'utf-8');
}
