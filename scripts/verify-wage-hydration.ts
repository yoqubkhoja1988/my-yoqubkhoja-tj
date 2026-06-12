import {
  formatWageAmount,
  hydrateWageScale,
} from '../src/lib/preschool-wage-scales';

const org = '8c19df05-9925-4a55-8daf-c03d607f954c';

const cases = [
  { position: 'Мураббия', education: 'general_secondary' as const, expected: 1191 },
  { position: 'Мураббия', education: 'secondary_vocational' as const, expected: 1702 },
  { position: 'Мураббия', education: 'secondary_vocational_c2' as const, expected: 1803 },
  { position: 'Мураббия', education: 'secondary_vocational_c1' as const, expected: 1889 },
  { position: 'Мураббия', education: 'higher' as const, expected: 1989 },
  { position: 'Мураббия', education: 'higher_c2' as const, expected: 2197 },
  { position: 'Мураббия', education: 'higher_c1' as const, expected: 2393 },
  { position: 'Мураббия', education: 'higher_superior' as const, expected: 2699 },
  { position: 'Мудир', education: 'higher_c1' as const, expected: 0 },
  { position: 'Мушовир', education: 'higher_c1' as const, expected: 1989 },
  { position: 'Муҳосиб', education: 'higher_c1' as const, expected: 1790.1 },
];

let failed = 0;
for (const { position, education, expected } of cases) {
  const scale = hydrateWageScale({ educationLevel: education, extraDuties: [] }, org, position);
  const got = Number(scale.baseSalary?.replace(/\s/g, '').replace(',', '.'));
  if (Math.abs(got - expected) > 0.01) {
    console.error('FAIL', position, education, 'got', got, 'expected', expected, 'group', scale.group);
    failed++;
  } else {
    console.log('OK', position, education, '->', formatWageAmount(expected), 'group', scale.group);
  }
}

const stale = hydrateWageScale(
  { group: 'educator-20h', educationLevel: 'higher_c1', baseSalary: '2 393,00' },
  org,
  'Мудир'
);
const staleSalary = Number(stale.baseSalary?.replace(/\s/g, '').replace(',', '.'));
if (stale.group !== 'management' || staleSalary !== 0) {
  console.error('FAIL stale hydrate for Мудир', stale.group, staleSalary);
  failed++;
} else {
  console.log('OK stale educator scale corrected for Мудир -> management, 0');
}

if (failed) process.exit(1);
console.log('\nAll hydration checks passed.');
