/**
 * Sync official legal sections into data/organization-sections.json (file mode).
 * Usage: node scripts/sync-official-legal.mjs
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const sectionsFile = join(root, 'data', 'organization-sections.json');

const FOOD_SAFETY_ID = 'b8c5fe62-c216-410e-9dcf-c845838f0ad7';
const KINDERGARTEN_ID = '8c19df05-9925-4a55-8daf-c03d607f954c';

// Inline catalog (mirrors src/lib/official-legal-catalog.ts)
const catalog = {
  [FOOD_SAFETY_ID]: {
    laws: [
      { title: 'Қонуни ҶТ «Дар бораи сифат ва бехатарии маҳсулоти озуқаворӣ»', detail: 'Асоси қонунгузорӣ', description: 'Қонуни асосӣ оиди талаботҳо ба сифат ва бехатарии маҳсулоти озуқаворӣ.', url: 'https://www.majlisioli.tj/tj/legislation/', sourceSite: 'majlisioli', documentType: 'law', fields: [{ label: 'Санаи қабул', value: '2017' }, { label: 'Ҳолат', value: 'Эътибор дорад' }] },
      { title: 'Қонуни ҶТ «Дар бораи бехатарии озуқаворӣ»', detail: 'Бехатарии озуқаворӣ', description: 'Қонун оиди таъмини бехатарии озуқаворӣ.', url: 'https://www.majlisioli.tj/tj/legislation/', sourceSite: 'majlisioli', documentType: 'law', fields: [{ label: 'Санаи қабул', value: '2015' }] },
      { title: 'Қонуни ҶТ «Дар бораи ветеринария»', detail: 'Ветеринария', description: 'Фаъолияти ветеринарӣ ва бехатарии маҳсулоти ҳайвонӣ.', url: 'https://www.majlisioli.tj/tj/legislation/', sourceSite: 'majlisioli', documentType: 'law', fields: [{ label: 'Санаи қабул', value: '2012' }] },
      { title: 'Қонуни ҶТ «Дар бораи ҳимояи растаниҳо»', detail: 'Ҳимояи растаниҳо', description: 'Ҳимояи растаниҳо ва назорати зараррасонҳо.', url: 'https://www.majlisioli.tj/tj/legislation/', sourceSite: 'majlisioli', documentType: 'law', fields: [{ label: 'Санаи қабул', value: '2014' }] },
    ],
    decisions: [
      { title: 'Қарори Ҳукумати ҶТ №595', detail: 'Положениеи Кумитаи бехатарии озуқаворӣ', description: 'Ташкили Кумитаи бехатарии озуқаворӣ.', url: 'https://cfs.tj/', sourceSite: 'cfs', documentType: 'decision', fields: [{ label: 'Сана', value: '29.12.2017' }] },
      { title: 'Қарори Ҳукумати ҶТ №66', detail: 'Феҳристи хизматрасониҳои ветеринарӣ', description: 'Хизматрасониҳои пулакии ветеринарӣ (26.02.2015).', url: 'https://cfs.tj/list-of-cervices', sourceSite: 'cfs', documentType: 'decision', fields: [{ label: 'Сана', value: '26.02.2015' }] },
    ],
    documents: [
      { title: 'Стандартҳои миллии бехатарии озуқаворӣ', detail: 'ТҶ СТ', description: 'Стандартҳои техникии миллии Тоҷикистон.', url: 'https://cfs.tj/', sourceSite: 'cfs', documentType: 'document' },
      { title: 'Ҳуҷҷатҳои иҷозатдиҳӣ', detail: 'Иҷозатнома', description: 'Ҳуҷҷатҳои зарур барои фаъолият.', url: 'https://cfs.tj/', sourceSite: 'cfs', documentType: 'document' },
      { title: 'Положениеи Кумитаи бехатарии озуқаворӣ', detail: 'Санади ташкилотӣ', description: 'Низомномаи Кумита.', url: 'https://cfs.tj/', sourceSite: 'cfs', documentType: 'document' },
    ],
  },
  [KINDERGARTEN_ID]: {
    laws: [
      { title: 'Қонуни ҶТ «Дар бораи таълиму тарбияи томактабӣ»', detail: '№1056', description: 'Қонуни асосӣ оид ба таълиму тарбияи томактабӣ.', url: 'https://www.majlisioli.tj/tj/legislation/', sourceSite: 'majlisioli', documentType: 'law', fields: [{ label: 'Сана', value: '28.12.2013' }] },
      { title: 'Қонуни ҶТ «Дар бораи маориф»', detail: 'Санади меъёрии умумӣ', description: 'Қонуни умумии маориф.', url: 'https://www.majlisioli.tj/tj/legislation/', sourceSite: 'majlisioli', documentType: 'law' },
      { title: 'Кодекси меҳнати Ҷумҳурии Тоҷикистон', detail: 'КМҶ', description: 'Қонунгузории меҳнат.', url: 'https://normativka-pro.akdt.tj/', sourceSite: 'normativka', documentType: 'law' },
    ],
    decisions: [
      { title: 'Қарори Ҳукумати ҶТ №256', detail: 'Низомномаи намунавии МДТ', description: 'Низомномаи намунавии муассисаи таълимии томактабӣ.', url: 'https://edu.tj/', sourceSite: 'edu', documentType: 'decision', fields: [{ label: 'Сана', value: '29.04.2015' }] },
      { title: 'Қарори Ҳукумати ҶТ №113', detail: 'Меъёрҳои музди меҳнат', description: 'Музди меҳнат барои кормандони МДТ (аз 01.09.2025).', url: 'https://www.president.tj/', sourceSite: 'president', documentType: 'decision', fields: [{ label: 'Сана', value: '28.02.2025' }] },
      { title: 'Стандарти давлатии таҳсилоти томактабӣ', detail: 'Тасдиқи Ҳукумати ҶТ', description: 'Меъёрҳои таълиму тарбияи томактабӣ.', url: 'https://edu.tj/', sourceSite: 'edu', documentType: 'decision' },
    ],
    documents: [
      { title: 'Оинномаи МДТМ Мактаб-кӯдакистони №1', detail: 'Ҳуҷҷати таъсисӣ', description: 'Оиннома мувофиқи Низомномаи намунавии МДТ.', url: 'https://edu.tj/', sourceSite: 'edu', documentType: 'document' },
      { title: 'Иҷозатномаи фаъолият', detail: 'Шуъбаи маорифи ноҳия', description: 'Иҷозатнома барои фаъолияти таълимию тарбиявӣ.', url: 'https://edu.tj/', sourceSite: 'edu', documentType: 'document' },
      { title: 'Аттестатсия ва аккредитатсия', detail: 'Назорати давлатӣ', description: 'Ҳуҷҷатҳои назорати давлатӣ.', url: 'https://edu.tj/', sourceSite: 'edu', documentType: 'document' },
    ],
  },
};

const summaries = {
  [FOOD_SAFETY_ID]: {
    laws: 'Қонунҳои амалкунанда дар соҳаи бехатарии озуқаворӣ — манбаъҳои расмии Маҷлиси Оли.',
    'government-decisions': 'Қарорҳои Ҳукумати ҶТ — манбаъҳои расмии cfs.tj.',
    'official-documents': 'Санадҳои меъёрии ҳуқуқӣ ва стандартҳо — аз сомонаҳои расмӣ.',
  },
  [KINDERGARTEN_ID]: {
    laws: 'Қонунҳои амалкунанда дар соҳаи таълиму тарбияи томактабӣ.',
    'government-decisions': 'Қарорҳои Ҳукумати ҶТ оид ба таълими томактабӣ — edu.tj.',
    'official-documents': 'Санадҳои таъсисӣ, иҷозатнома ва назорати давлатӣ.',
  },
};

function loadSections() {
  try {
    return JSON.parse(readFileSync(sectionsFile, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSections(data) {
  const dir = dirname(sectionsFile);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const temp = `${sectionsFile}.tmp`;
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  renameSync(temp, sectionsFile);
}

const all = loadSections();

for (const [orgId, sections] of Object.entries(catalog)) {
  if (!all[orgId]) all[orgId] = {};
  all[orgId].laws = { summary: summaries[orgId].laws, items: sections.laws };
  all[orgId]['government-decisions'] = { summary: summaries[orgId]['government-decisions'], items: sections.decisions };
  all[orgId]['official-documents'] = { summary: summaries[orgId]['official-documents'], items: sections.documents };
}

saveSections(all);
console.log('Official legal sections synced to data/organization-sections.json');
