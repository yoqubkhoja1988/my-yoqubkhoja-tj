#!/usr/bin/env node
/**
 * Санҷиш: МДТМ кӯдаkiston ва Маркази бехатарии озуқаворӣ омехта нашаванд.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const FOOD_SAFETY_ID = 'b8c5fe62-c216-410e-9dcf-c845838f0ad7';
const KINDERGARTEN_ID = '8c19df05-9925-4a55-8daf-c03d607f954c';

const root = process.cwd();
const orgs = JSON.parse(readFileSync(join(root, 'data', 'organizations.json'), 'utf-8'));
const sections = JSON.parse(
  readFileSync(join(root, 'data', 'organization-sections.json'), 'utf-8')
);

const errors = [];

const orgIds = orgs.map((o) => o.id);
for (const id of [FOOD_SAFETY_ID, KINDERGARTEN_ID]) {
  if (!orgIds.includes(id)) {
    errors.push(`organizations.json: ташкилоти ${id} ёфт нашуд`);
  }
}

for (const key of Object.keys(sections)) {
  if (key !== FOOD_SAFETY_ID && key !== KINDERGARTEN_ID) {
    errors.push(`organization-sections.json: калиди номаълум ${key}`);
  }
}

function checkEmployees(orgId, label) {
  const staff = sections[orgId]?.staff;
  if (!staff?.employees) return;

  for (const emp of staff.employees) {
    if (orgId === KINDERGARTEN_ID && emp.id.startsWith('emp-') && !emp.id.startsWith('kg-emp-')) {
      errors.push(`${label}: корманд ${emp.id} (${emp.fullName}) — ID-и марказ`);
    }
    if (orgId === FOOD_SAFETY_ID && emp.id.startsWith('kg-emp-')) {
      errors.push(`${label}: корманд ${emp.id} (${emp.fullName}) — ID-и кӯдаkiston`);
    }
  }
}

checkEmployees(KINDERGARTEN_ID, 'МДТМ кӯдаkiston');
checkEmployees(FOOD_SAFETY_ID, 'Маркази бехатарии озуқаворӣ');

const kgTables = sections[KINDERGARTEN_ID]?.staff?.tables ?? [];
for (const table of kgTables) {
  const t = table.title.toLowerCase();
  if (['ветеринар', 'фитосанитар', 'озмоишгоҳ'].some((m) => t.includes(m))) {
    errors.push(`МДТМ: ҷадвали «${table.title}» ба марказ тааллуқ дорад`);
  }
}

if (errors.length > 0) {
  console.error('Хатогиҳои ҷудоии ташкилот:\n');
  errors.forEach((e) => console.error(`  • ${e}`));
  process.exit(1);
}

const kgJson = JSON.stringify(sections[KINDERGARTEN_ID] ?? {});
if (/[Сс]ардор/.test(kgJson)) {
  console.error('Хатогӣ: дар маълумоти МДТМ кӯдаkiston калимаи «Сардор» ёфт шуд — барои имзо «Директор» истифода шавад');
  process.exit(1);
}

console.log('✓ МДТМ кӯдаkiston ва Маркази бехатарии озуқаворӣ ҷудоанд');
