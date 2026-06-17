import { ALL_SECTION_SLUGS } from '@/lib/activity-directions';
import { FINANCE_SECTION_IDS } from '@/lib/finance-section-nav';
import { FINANCIAL_REPORT_SECTION_SLUGS } from '@/lib/financial-reports-menu';
import { STAFF_SECTION_IDS } from '@/lib/staff-section-nav';

type SectionEntry = {
  title: string;
  hint: string;
  greeting: string;
  howTo?: string;
};

const SENSITIVE_NOTE =
  ' Маълумоти махфии кормандон, музд ё рақамҳои дохилии молия ошкор намешавад.';

const ORG_SECTIONS: Record<string, SectionEntry> = {
  overview: {
    title: 'Умумӣ',
    hint: 'Саҳифаи умумии ташкилот — менюи чап, бахшҳои дастрас ва иҷозатҳо.',
    greeting: 'Мебинам, шумо дар саҳифаи **умумӣ**-и ташкилот ҳастед.',
  },
  'org-info': {
    title: 'Маълумот',
    hint: 'Маълумоти умумии ташкилот, сарлавҳаи ҳисобот, РМА.',
    greeting: 'Мебинам, шумо дар бахши **маълумоти ташкилот** ҳастед.',
  },
  charter: {
    title: 'Оиннома',
    hint: 'Оиннома ва ҳуҷҷатҳои таъсисӣ — хондан, таҳрир (агар иҷозат бошад), чоп.',
    greeting: 'Мебинам, шумо дар бахши **оиннома** ҳастед.',
  },
  'sectoral-programs': {
    title: 'Барномаҳои соҳавӣ',
    hint: 'Барномаҳои соҳавии ташкилот.',
    greeting: 'Мебинам, шумо дар бахши **барномаҳои соҳавӣ** ҳастед.',
  },
  'investment-projects': {
    title: 'Лоиҳаҳои сармоягузорӣ',
    hint: 'Лоиҳаҳои сармоягузорӣ ё лоиҳаҳои барномавӣ.',
    greeting: 'Мебинам, шумо дар бахши **лоиҳаҳо** ҳастед.',
  },
  laws: {
    title: 'Қонунҳо',
    hint: 'Қонунҳои марбут — хондан ва ҷустуҷӯ.',
    greeting: 'Мебинам, шумо дар бахши **қонунҳо** ҳастед.',
  },
  'government-decisions': {
    title: 'Қарорҳо',
    hint: 'Қарорҳои Ҳукумат ва санадҳои меъёрии дигар.',
    greeting: 'Мебинам, шумо дар бахши **қарорҳо** ҳастед.',
  },
  'official-documents': {
    title: 'Санадҳо',
    hint: 'Санадҳои расмӣ ва ҳуҷҷатҳои дохилии ташкилот.',
    greeting: 'Мебинам, шумо дар бахши **санадҳо** ҳастед.',
  },
  'central-press': {
    title: 'Маркази матбуот',
    hint: 'Маводҳои матбуотӣ.',
    greeting: 'Мебинам, шумо дар бахши **матбуот** ҳастед.',
  },
  'list-of-enterprises': {
    title: 'Феҳристи корхонаҳо',
    hint: 'Феҳристи корхонаҳо ва иншоотҳо.',
    greeting: 'Мебинам, шумо дар **феҳристи корхонаҳо** ҳастед.',
  },
  'list-of-services': {
    title: 'Феҳристи хизматрасониҳо',
    hint: 'Хизматрасониҳои ташкилот.',
    greeting: 'Мебинам, шумо дар **феҳристи хизматрасониҳо** ҳастед.',
  },
  licensing: {
    title: 'Иҷозатномаҳо',
    hint: 'Ҳуҷатҳои иҷозатдиҳӣ ва иҷозатномадиҳӣ.',
    greeting: 'Мебинам, шумо дар бахши **иҷозатномаҳо** ҳастед.',
  },
  veterinary: {
    title: 'Ветеринария',
    hint: 'Самти ветеринарӣ.',
    greeting: 'Мебинам, шумо дар бахши **ветеринария** ҳастед.',
  },
  phytosanitary: {
    title: 'Фитосанитария',
    hint: 'Фитосанитария ва карантини растаниҳо.',
    greeting: 'Мебинам, шумо дар бахши **фитосанитария** ҳастед.',
  },
  'plant-protection': {
    title: 'Ҳимояи растаниҳо',
    hint: 'Ҳимояи растаниҳо.',
    greeting: 'Мебинам, шумо дар бахши **ҳимояи растаниҳо** ҳастед.',
  },
  'seed-production': {
    title: 'Тухмии растаниҳо',
    hint: 'Тухмии растаниҳо.',
    greeting: 'Мебинам, шумо дар бахши **тухмии растаниҳо** ҳастед.',
  },
  'breeding-supervision': {
    title: 'Назорати насли ҳайвонот',
    hint: 'Назорати насли ҳайвонот.',
    greeting: 'Мебинам, шумо дар бахши **насли ҳайвонот** ҳастед.',
  },
  news: {
    title: 'Хабарҳо',
    hint: 'Хабарҳо ва эълонҳо.',
    greeting: 'Мебинам, шумо дар бахши **хабарҳо** ҳастед.',
  },
  photogallery: {
    title: 'Суратнигор',
    hint: 'Аксҳо ва суратнигор.',
    greeting: 'Мебинам, шумо дар **суратнигор** ҳастед.',
  },
  magazine: {
    title: 'Маҷалла',
    hint: 'Маҷалла ва нашрияҳо.',
    greeting: 'Мебинам, шумо дар бахши **маҷалла** ҳастед.',
  },
  videos: {
    title: 'Видеомаводҳо',
    hint: 'Видеоҳо.',
    greeting: 'Мебинам, шумо дар бахши **видео** ҳастед.',
  },
  reception: {
    title: 'Муроҷиат ба роҳбар',
    hint: 'Фиристодани муроҷиат ба роҳбарият.',
    greeting: 'Мебинам, шумо дар бахши **муроҷиат ба роҳбар** ҳастед.',
  },
  staff: {
    title: 'Кормандон ва кадрҳо',
    hint: 'Кадрҳо: омор, басти вазифаҳо, холигиҳо, бақайдгирӣ, ҷадвали ҳузур.',
    greeting: 'Мебинам, шумо дар бахши **кадр** ҳастед.',
  },
  legal: {
    title: 'Ҳуҷҷатҳои ҳуқуқӣ',
    hint: 'Ҳуҷҷатҳои ҳуқуқӣ ва санадҳои дохилӣ.',
    greeting: 'Мебинам, шумо дар бахши **ҳуҷҷатҳои ҳуқуқӣ** ҳастед.',
  },
  finance: {
    title: 'Муҳосибот ва молия',
    hint: 'Молия: омор, буҷет, музд, пардохт, рухсатиҳо, тамос.',
    greeting: 'Мебинам, шумо дар бахши **молия** ҳастед.',
  },
  'formation-report': {
    title: 'Ҳисоботи ташкилӣ',
    hint: 'Ҳисоботи ташкилӣ — пур кардан, захира, чоп/экспорт.',
    greeting: 'Мебинам, шумо дар бахши **ҳисоботи ташкилӣ** ҳастед.',
  },
  reports: {
    title: 'Ҳисобот',
    hint: 'Ҳисоботҳои умумии ташкилот.',
    greeting: 'Мебинам, шумо дар бахши **ҳисобот** ҳастед.',
  },
  'education-standard': {
    title: 'Стандарти таҳсилот',
    hint: 'Стандарти давлатии таҳсилоти томактабӣ.',
    greeting: 'Мебинам, шумо дар бахши **стандарт** ҳастед.',
  },
  'education-programs': {
    title: 'Барномаҳои таълиму тарбия',
    hint: 'Барномаҳои таълиму тарбия.',
    greeting: 'Мебинам, шумо дар бахши **барномаҳои таълим** ҳастед.',
  },
  'work-plan': {
    title: 'Нақшаи кории таълимӣ',
    hint: 'Нақшаи кории таълимӣ.',
    greeting: 'Мебинам, шумо дар бахши **нақшаи корӣ** ҳастед.',
  },
  methodology: {
    title: 'Таъминоти методӣ',
    hint: 'Маводҳои методӣ.',
    greeting: 'Мебинам, шумо дар бахши **методика** ҳастед.',
  },
  governance: {
    title: 'Идоракунӣ',
    hint: 'Идоракунии ташкилот.',
    greeting: 'Мебинам, шумо дар бахши **идоракунӣ** ҳастед.',
  },
  'state-supervision': {
    title: 'Назорати давлатӣ',
    hint: 'Назорати давлатӣ.',
    greeting: 'Мебинам, шумо дар бахши **назорати давлатӣ** ҳастед.',
  },
  'age-groups': {
    title: 'Гурӯҳҳои синну солӣ',
    hint: 'Гурӯҳҳои синну солӣ дар МДТ.',
    greeting: 'Мебинам, шумо дар бахши **гурӯҳҳои синну солӣ** ҳастед.',
  },
  enrollees: {
    title: 'Тарбиягирандагон',
    hint: 'Тарбиягирандагон ва бақайдгирӣ.',
    greeting: 'Мебинам, шумо дар бахши **тарбиягирандагон** ҳастед.',
  },
  'parent-work': {
    title: 'Кор бо оила',
    hint: 'Кор бо оила ва ҷомеа.',
    greeting: 'Мебинам, шумо дар бахши **кор бо оила** ҳастед.',
  },
  'medical-service': {
    title: 'Хизматрасонии тиббӣ',
    hint: 'Хизматрасонии тиббӣ.',
    greeting: 'Мебинам, шумо дар бахши **тиббӣ** ҳастед.',
  },
  nutrition: {
    title: 'Таъмини ғизо',
    hint: 'Таъмини ғизо.',
    greeting: 'Мебинам, шумо дар бахши **ғизо** ҳастед.',
  },
  'material-base': {
    title: 'Заминаи моддию техникӣ',
    hint: 'Заминаи моддию техникӣ.',
    greeting: 'Мебинам, шумо дар бахши **заминаи моддию техникӣ** ҳастед.',
  },
  'organization-contracts': {
    title: 'Шартномаҳо',
    hint: 'Шартномаҳо бо ташкилотҳо — эҷод, таҳрир, чоп.',
    greeting: 'Мебинам, шумо дар бахши **шартномаҳо** ҳастед.',
  },
  'financial-reports': {
    title: 'Ҳисоботҳои молиявӣ (умумӣ)',
    hint: 'Ҳисоботҳои молиявӣ мувофиқи Дастурамал №204.',
    greeting: 'Мебинам, шумо дар **ҳисоботҳои молиявӣ** ҳастед.',
  },
  'financial-reports-form1': {
    title: 'Шакли молиявии №1',
    hint: 'Шакли №1 — пур кардан, захира, чоп.',
    greeting: 'Мебинам, шумо дар **шакли молиявии №1** ҳастед.',
  },
  'financial-reports-form2': {
    title: 'Шакли молиявии №2',
    hint: 'Шакли №2 — пур кардан, захира, чоп.',
    greeting: 'Мебинам, шумо дар **шакли молиявии №2** ҳастед.',
  },
  'financial-reports-form3': {
    title: 'Шакли молиявии №3',
    hint: 'Шакли №3 — пур кардан, захира, чоп.',
    greeting: 'Мебинам, шумо дар **шакли молиявии №3** ҳастед.',
  },
  'financial-reports-form4': {
    title: 'Шакли молиявии №4',
    hint: 'Шакли №4 — пур кардан, захира, чоп.',
    greeting: 'Мебинам, шумо дар **шакли молиявии №4** ҳастед.',
  },
  'financial-reports-form5': {
    title: 'Шакли молиявии №5',
    hint: 'Шакли №5 — пур кардан, захира, чоп.',
    greeting: 'Мебинам, шумо дар **шакли молиявии №5** ҳастед.',
  },
  'financial-reports-form6': {
    title: 'Шакли молиявии №6',
    hint: 'Шакли №6 — пур кардан, захира, чоп.',
    greeting: 'Мебинам, шумо дар **шакли молиявии №6** ҳастед.',
  },
  'financial-reports-annual': {
    title: 'Ҳисоботи солона',
    hint: 'Ҳисоботи солонаи молиявӣ.',
    greeting: 'Мебинам, шумо дар **ҳисоботи солона** ҳастед.',
  },
  'financial-reports-quarterly': {
    title: 'Ҳисоботи фосилавӣ',
    hint: 'Ҳисоботи фосилавии молиявӣ.',
    greeting: 'Мебинам, шумо дар **ҳисоботи фосилавӣ** ҳастед.',
  },
  'financial-reports-deadlines': {
    title: 'Мӯҳлатҳои ҳисобот',
    hint: 'Мӯҳлатҳои пешниҳоди ҳисоботҳои молиявӣ.',
    greeting: 'Мебинам, шумо дар бахши **мӯҳлатҳо** ҳастед.',
  },
};

const STAFF_SUB_SECTIONS: Record<string, SectionEntry> = {
  'staff-stats': {
    title: 'Омори кадр',
    hint: 'Омори штат, кормандон, холигиҳо — бе ошкор кардани маълумоти шахсӣ.',
    greeting: 'Мебинам, шумо дар зерменюи **омори кадр** ҳастед.',
  },
  'staff-schedule': {
    title: 'Басти вазифаҳо',
    hint: 'Ҷадвали штат, вазифаҳо, шуъбаҳо — илова, таҳрир, импорт.',
    greeting: 'Мебинам, шумо дар **басти вазифаҳо** ҳастед.',
    howTo:
      '📋 **Чӣ тавр басти вазифаҳоро пур кунам?**\n\n' +
      '1. Зерменюи **Басти вазифаҳо**-ро интихоб кунед\n' +
      '2. Шуъба/вазифаро **илова** кунед\n' +
      '3. Шумораи ҷойҳо ва дараҷаи вазифаро муайян кунед\n' +
      '4. **Захира** кунед\n\n' +
      '💡 Импорт аз Excel/CSV мумкин аст.\n' +
      '⚠️ Бе басти вазифаҳо бақайдгирии кормандон душвор мешавад.',
  },
  'staff-vacancy': {
    title: 'Холигиҳо',
    hint: 'Ҷойҳои холии вазифаҳо.',
    greeting: 'Мебинам, шумо дар бахши **холигиҳо** ҳастед.',
  },
  'staff-registry': {
    title: 'Бақайдгирии кормандон',
    hint: 'Реестри кормандон — бақайдгирӣ, таҳрир, импорт (бе ошкор кардани PII).',
    greeting: 'Мебинам, шумо дар **бақайдгирии кормандон** ҳастед.',
    howTo:
      '📋 **Чӣ тавр кормандро ба қайд мегирам?**\n\n' +
      '1. Шумо дар **Бақайдгирии кормандон** ҳастед ✓\n' +
      '2. Аввал **Басти вазифаҳо**-ро пур кунед (вазифа ва шуъба бояд мавҷуд бошанд)\n' +
      '3. Тугмаи **иловаи корманд**-ро пахш кунед\n' +
      '4. **Ному насаб**, вазифа, шуъба, телефон, санаи қабулро нависед\n' +
      '5. Майдонҳои иловагиро пур кунед (агар лозим бошад)\n' +
      '6. **Захира** кунед\n\n' +
      '💡 Импорт аз **Excel/CSV** низ мумкин аст.\n' +
      '⚠️ Агар тугмаи «Захира» намебинед — шумо дар режими **«танҳо назорат»** ҳастед ё иҷозат надоред.',
  },
  'staff-timesheet': {
    title: 'Ҷадвали ҳузур',
    hint: 'Ҷадвали ҳузур — пур кардан, чоп, захира.',
    greeting: 'Мебинам, шумо дар **ҷадвали ҳузур** ҳастед.',
    howTo:
      '📋 **Чӣ тавр ҷадвали ҳузурро пур кунам?**\n\n' +
      '1. Зерменюи **Ҷадвали ҳузур**-ро кушоед\n' +
      '2. Моҳ ва кормандонро интихоб кунед\n' +
      '3. Рӯзҳои ҳузур/ғоибатро қайд кунед\n' +
      '4. **Захира** ва **чоп** кунед',
  },
};

const FINANCE_SUB_SECTIONS: Record<string, SectionEntry> = {
  'finance-stats': {
    title: 'Омори молия',
    hint: 'Омори умумии молия — бе ошкор кардани рақамҳои дохилӣ.',
    greeting: 'Мебинам, шумо дар **омори молия** ҳастед.',
  },
  'finance-budget': {
    title: 'Буҷет',
    hint: 'Буҷет — пур кардан, захира, режими назорат.',
    greeting: 'Мебинам, шумо дар бахши **буҷет** ҳастед.',
  },
  'finance-payroll': {
    title: 'Манбаи музди меҳнат',
    hint: 'Манбаи музди меҳнат — тартиби пур кардан (музди амалӣ ошкор намешавад).',
    greeting: 'Мебинам, шумо дар **манбаи музди меҳнат** ҳастед.',
  },
  'finance-position-handover': {
    title: 'Вогузоркунии вазифа',
    hint: 'Вогузоркунии вазифа байни кормандон.',
    greeting: 'Мебинам, шумо дар **вогузоркунии вазифа** ҳастед.',
  },
  'finance-allowance-adjustment': {
    title: 'Иловапулӣ',
    hint: 'Иловапулӣ барои кормандон.',
    greeting: 'Мебинам, шумо дар бахши **иловапулӣ** ҳастед.',
  },
  'finance-payroll-ledger': {
    title: 'Китоби музди меҳнат',
    hint: 'Китоби музди меҳнат — ҳисобот (рақамҳо махфӣ).',
    greeting: 'Мебинам, шумо дар **китоби музди меҳнат** ҳастед.',
  },
  'finance-local-payroll-requirement': {
    title: 'Талабот ба молияи маҳал',
    hint: 'Талабот ба молияи маҳал.',
    greeting: 'Мебинам, шумо дар **талабот ба молияи маҳал** ҳастед.',
  },
  'finance-bank-payment': {
    title: 'Пардохт ба бонк',
    hint: 'Пардохт ба бонк — тартиби кор (ҳисоби бонкӣ махфӣ).',
    greeting: 'Мебинам, шумо дар **пардохт ба бонк** ҳастед.',
  },
  'finance-labor-leave': {
    title: 'Рухсатии меҳнатӣ',
    hint: 'Рухсатии меҳнатӣ — сабт, ҳисоб, чоп.',
    greeting: 'Мебинам, шумо дар **рухсатии меҳнатӣ** ҳастед.',
  },
  'finance-maternity-leave': {
    title: 'Рухсатии ҳомиладорӣ',
    hint: 'Рухсатии ҳомиладорӣ.',
    greeting: 'Мебинам, шумо дар **рухсатии ҳомиладорӣ** ҳастед.',
  },
  'finance-sick-leave': {
    title: 'Варақаи корношоямӣ',
    hint: 'Варақаи корношоямӣ.',
    greeting: 'Мебинам, шумо дар **варақаи корношоямӣ** ҳастед.',
  },
  'finance-contacts': {
    title: 'Тамос (молия)',
    hint: 'Тамосҳои молиявӣ.',
    greeting: 'Мебинам, шумо дар бахши **тамосҳои молия** ҳастед.',
  },
};

const APP_PAGES: { pattern: RegExp; entry: SectionEntry }[] = [
  {
    pattern: /\/login\/?(?:[?#]|$)/i,
    entry: {
      title: 'Вуруд',
      hint: 'Саҳифаи вуруд — номи вуруд, рамз, мушкилоти вуруд.',
      greeting: 'Мебинам, шумо дар саҳифаи **вуруд** ҳастед.',
    },
  },
  {
    pattern: /\/register\/?(?:[?#]|$)/i,
    entry: {
      title: 'Сабти ном',
      hint: 'Сабти ном — интизори тасдиқи маъмур.',
      greeting: 'Мебинам, шумо дар саҳифаи **сабти ном** ҳастед.',
    },
  },
  {
    pattern: /\/dashboard/i,
    entry: {
      title: 'Лоиҳаҳо',
      hint: 'Панели лоиҳаҳо (Dashboard).',
      greeting: 'Мебинам, шумо дар **панели лоиҳаҳо** ҳастед.',
    },
  },
  {
    pattern: /\/organizations\/?(?:[?#]|$)/i,
    entry: {
      title: 'Ташкилотҳо',
      hint: 'Рӯйхати ташкилотҳо — интихоб ва иҷозатҳо.',
      greeting: 'Мебинам, шумо дар **рӯйхати ташкилотҳо** ҳастед.',
    },
  },
];

export type ChatPageContext = {
  sectionTitle: string | null;
  subSectionTitle: string | null;
  pageHint: string | null;
  greetingNote: string;
};

function isSensitiveSection(sectionSlug: string | null, subSlug: string | null): boolean {
  if (sectionSlug === 'staff' || sectionSlug === 'finance') return true;
  if (sectionSlug?.startsWith('financial-reports')) return true;
  if (subSlug?.startsWith('staff-') || subSlug?.startsWith('finance-')) return true;
  return false;
}

function parseSourcePage(sourcePage: string): {
  path: string;
  hash: string;
  orgSection: string | null;
} {
  const hashIndex = sourcePage.indexOf('#');
  const path = hashIndex >= 0 ? sourcePage.slice(0, hashIndex) : sourcePage;
  const hash = hashIndex >= 0 ? sourcePage.slice(hashIndex + 1).trim() : '';

  const match = path.match(/\/organizations\/[^/]+\/([^/?]+)/i);
  return {
    path,
    hash,
    orgSection: match?.[1] ?? null,
  };
}

function lookupOrgSection(slug: string): SectionEntry {
  return (
    ORG_SECTIONS[slug] ?? {
      title: slug.replace(/-/g, ' '),
      hint: `Бахши «${slug}» — кӯмак дар истифодаи ин бахш.`,
      greeting: `Мебинам, шумо дар бахши **${slug.replace(/-/g, ' ')}** ҳастед.`,
    }
  );
}

export function resolveChatPageContext(sourcePage?: string | null): ChatPageContext {
  if (!sourcePage?.trim()) {
    return { sectionTitle: null, subSectionTitle: null, pageHint: null, greetingNote: '' };
  }

  const raw = sourcePage.trim();
  const { path, hash, orgSection } = parseSourcePage(raw);

  for (const appPage of APP_PAGES) {
    if (appPage.pattern.test(raw) || appPage.pattern.test(path)) {
      return {
        sectionTitle: appPage.entry.title,
        subSectionTitle: null,
        pageHint: appPage.entry.hint,
        greetingNote: `\n\n${appPage.entry.greeting}`,
      };
    }
  }

  if (!orgSection) {
    const orgOnly = /\/organizations\/[^/]+\/?$/i.test(path);
    if (orgOnly) {
      return {
        sectionTitle: 'Ташкилот',
        subSectionTitle: null,
        pageHint: 'Саҳифаи ташкилот — менюи чап ва бахшҳо.',
        greetingNote: '\n\nМебинам, шумо дар саҳифаи **ташкилот** ҳастед.',
      };
    }
    return {
      sectionTitle: null,
      subSectionTitle: null,
      pageHint: `Корбар дар «${raw}» — ҷавобро ба ин саҳифа мувофиқ кун.`,
      greetingNote: '',
    };
  }

  const section = lookupOrgSection(orgSection);
  let subSection: SectionEntry | null = null;

  if (orgSection === 'staff' && hash && STAFF_SUB_SECTIONS[hash]) {
    subSection = STAFF_SUB_SECTIONS[hash];
  } else if (orgSection === 'finance' && hash && FINANCE_SUB_SECTIONS[hash]) {
    subSection = FINANCE_SUB_SECTIONS[hash];
  }

  const sensitive = isSensitiveSection(orgSection, hash || null);
  const sensitiveSuffix = sensitive ? SENSITIVE_NOTE : '';

  const pageHint = subSection
    ? `${section.hint} Зерменю: «${subSection.title}». ${subSection.hint}${sensitiveSuffix}`
    : `${section.hint}${sensitiveSuffix}`;

  const greetingNote = subSection
    ? `\n\n${section.greeting} Ҳоло дар зерменюи **${subSection.title}** ҳастед — савол диҳед.`
    : `\n\n${section.greeting}`;

  return {
    sectionTitle: section.title,
    subSectionTitle: subSection?.title ?? null,
    pageHint,
    greetingNote,
  };
}

export function isProceduralQuestion(message: string): boolean {
  const text = message.trim().toLowerCase();
  return /(чӣ\s*тавр|чӣ\s*гуна|читавр|читав|how\s+to|how\s+do|how\s+can|qanday|қандай|как\s+(мне|войти|сделать|выполнить|добавить)|инҷо\s*чӣ|иҷро\s*кун|кундам|кунем|ба\s*қайд|бақайдгир)/i.test(
    text
  );
}

export function getPageHowToGuide(sourcePage?: string | null): string | null {
  if (!sourcePage?.trim()) return null;

  const { hash, orgSection } = parseSourcePage(sourcePage.trim());
  if (!orgSection) return null;

  if (orgSection === 'staff' && hash && STAFF_SUB_SECTIONS[hash]?.howTo) {
    return STAFF_SUB_SECTIONS[hash].howTo!;
  }
  if (orgSection === 'finance' && hash && FINANCE_SUB_SECTIONS[hash]?.howTo) {
    return FINANCE_SUB_SECTIONS[hash].howTo!;
  }
  if (ORG_SECTIONS[orgSection]?.howTo) {
    return ORG_SECTIONS[orgSection].howTo!;
  }

  if (hash) return null;

  const section = lookupOrgSection(orgSection);
  return `📌 **${section.title}**\n\n${section.hint}`;
}

/** Validate section slugs stay in sync with app menus (dev-time sanity). */
export const KNOWN_CHAT_SECTION_SLUGS = [
  ...ALL_SECTION_SLUGS,
  ...FINANCIAL_REPORT_SECTION_SLUGS,
  ...STAFF_SECTION_IDS,
  ...FINANCE_SECTION_IDS,
];
