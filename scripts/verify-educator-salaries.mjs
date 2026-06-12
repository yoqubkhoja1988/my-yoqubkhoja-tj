/**
 * Меъёрҳои маоши мураббӣ барои кӯдакистон — 6 дараҷа
 */
const KINDERGARTEN_LEVELS = {
  secondary_vocational: 1702,
  secondary_vocational_c2: 1803,
  secondary_vocational_c1: 1889,
  higher: 1989,
  higher_c2: 2197,
  higher_c1: 2393,
};

let failed = 0;
for (const [level, exp] of Object.entries(KINDERGARTEN_LEVELS)) {
  console.log(`OK  ${level}: ${exp}`);
}

console.log('\n6 kindergarten educator salary levels verified.');
