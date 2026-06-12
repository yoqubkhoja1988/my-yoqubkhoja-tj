import {
  FOOD_SAFETY_CENTER_ID,
  KINDERGARTEN_SCHOOL_ID,
} from '@/lib/activity-directions';
import { OfficialLegalBundle, OfficialLegalEntry, OfficialLegalSource } from '@/types/official-legal';

/** Сомонаҳои расмии манбаъҳои қонунгузорӣ */
export const OFFICIAL_LEGAL_SOURCES: OfficialLegalSource[] = [
  { id: 'majlisioli', name: 'Маҷлиси Олии ҶТ', baseUrl: 'https://www.majlisioli.tj' },
  { id: 'president', name: 'Президенти ҶТ', baseUrl: 'https://www.president.tj' },
  { id: 'adliya', name: 'Вазорати адлия', baseUrl: 'https://www.adliya.tj' },
  { id: 'cfs', name: 'Кумитаи бехатарии озуқаворӣ', baseUrl: 'https://cfs.tj' },
  { id: 'edu', name: 'Вазорати маориф ва илми ҶТ', baseUrl: 'https://edu.tj' },
  { id: 'normativka', name: 'Базаи қонунгузорӣ (normativka)', baseUrl: 'https://normativka-pro.akdt.tj' },
];

const FOOD_SAFETY_LAWS: OfficialLegalEntry[] = [
  {
    id: 'fs-law-food-quality',
    type: 'law',
    title: 'Қонуни ҶТ «Дар бораи сифат ва бехатарии маҳсулоти озуқаворӣ»',
    detail: 'Асоси қонунгузорӣ',
    description:
      'Қонуни асосӣ оиди талаботҳо ба сифат ва бехатарии маҳсулоти озуқаворӣ дар тамоми занҷираи таъминот.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    adoptedAt: '2017',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Маҷлиси Оли' }],
  },
  {
    id: 'fs-law-food-safety',
    type: 'law',
    title: 'Қонуни ҶТ «Дар бораи бехатарии озуқаворӣ»',
    detail: 'Бехатарии озуқаворӣ',
    description: 'Қонун оиди таъмини бехатарии озуқаворӣ ва ҳуқуқҳои истеъмолкунандагон.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    adoptedAt: '2015',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Маҷлиси Оли' }],
  },
  {
    id: 'fs-law-veterinary',
    type: 'law',
    title: 'Қонуни ҶТ «Дар бораи ветеринария»',
    detail: 'Ветеринария',
    description: 'Қонун оиди фаъолияти ветеринарӣ, саломатии ҳайвонот ва бехатарии маҳсулоти ҳайвонӣ.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    adoptedAt: '2012',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Маҷлиси Оли' }],
  },
  {
    id: 'fs-law-plant-protection',
    type: 'law',
    title: 'Қонуни ҶТ «Дар бораи ҳимояи растаниҳо»',
    detail: 'Ҳимояи растаниҳо',
    description: 'Қонун оиди ҳимояи растаниҳо, назорати зараррасонҳо ва рештакҳои химиявӣ.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    adoptedAt: '2014',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Маҷлиси Оли' }],
  },
];

const FOOD_SAFETY_DECISIONS: OfficialLegalEntry[] = [
  {
    id: 'fs-decree-595',
    type: 'decision',
    title: 'Қарори Ҳукумати ҶТ №595',
    detail: 'Положениеи Кумитаи бехатарии озуқаворӣ',
    description:
      'Қарори Ҳукумат оиди ташкили Кумитаи бехатарии озуқаворӣ ва ваколатҳои он, аз ҷумла марказҳои шаҳру ноҳия.',
    officialUrl: 'https://cfs.tj/',
    sourceId: 'cfs',
    officialNumber: '№595',
    adoptedAt: '29.12.2017',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Ҳукумати Ҷумҳурии Тоҷикистон' }],
  },
  {
    id: 'fs-decree-66',
    type: 'decision',
    title: 'Қарори Ҳукумати ҶТ №66',
    detail: 'Феҳристи хизматрасониҳои ветеринарӣ',
    description:
      'Дар бораи Феҳристи намудҳои хизматрасониҳои пулакии ветеринарӣ ва тартиби расонидани онҳо (26.02.2015).',
    officialUrl: 'https://cfs.tj/list-of-cervices',
    sourceId: 'cfs',
    officialNumber: '№66',
    adoptedAt: '26.02.2015',
    status: 'Эътибор дорад',
    fields: [{ label: 'Манбаъ', value: 'cfs.tj/list-of-cervices' }],
  },
];

const FOOD_SAFETY_DOCUMENTS: OfficialLegalEntry[] = [
  {
    id: 'fs-doc-standards',
    type: 'document',
    title: 'Стандартҳои миллии бехатарии озуқаворӣ',
    detail: 'ТҶ СТ',
    description: 'Стандартҳои техникии миллии Тоҷикистон оиди сифат ва бехатарии маҳсулоти озуқаворӣ.',
    officialUrl: 'https://cfs.tj/',
    sourceId: 'cfs',
    status: 'Дар марказ дастрас',
    fields: [{ label: 'Миқдор', value: '45+ стандарт' }],
  },
  {
    id: 'fs-doc-licensing',
    type: 'document',
    title: 'Ҳуҷҷатҳои иҷозатдиҳӣ ва иҷозатномадиҳӣ',
    detail: 'Иҷозатнома',
    description: 'Ҳуҷҷатҳои зарур барои фаъолияти маркази таъминоти бехатарии озуқаворӣ.',
    officialUrl: 'https://cfs.tj/',
    sourceId: 'cfs',
    status: 'Эътибор дорад',
  },
  {
    id: 'fs-doc-committee-regulation',
    type: 'document',
    title: 'Положениеи Кумитаи бехатарии озуқаворӣ',
    detail: 'Санади ташкилотӣ',
    description: 'Низомномаи Кумитаи бехатарии озуқавории назди Ҳукумати Ҷумҳурии Тоҷикистон.',
    officialUrl: 'https://cfs.tj/',
    sourceId: 'cfs',
    status: 'Эътибор дорад',
  },
];

const KINDERGARTEN_LAWS: OfficialLegalEntry[] = [
  {
    id: 'kg-law-preschool',
    type: 'law',
    title: 'Қонуни ҶТ «Дар бораи таълиму тарбияи томактабӣ»',
    detail: '№1056',
    description: 'Қонуни асосӣ оид ба таълиму тарбияи томактабӣ, ҳуқуқ ва вазифаҳои муассиса.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    officialNumber: '№1056',
    adoptedAt: '28.12.2013',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Маҷлиси Оли' }],
  },
  {
    id: 'kg-law-education',
    type: 'law',
    title: 'Қонуни ҶТ «Дар бораи маориф»',
    detail: 'Санади меъёрии умумӣ',
    description: 'Қонуни умумии маориф дар Ҷумҳурии Тоҷикистон.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Маҷлиси Оли' }],
  },
  {
    id: 'kg-law-labor',
    type: 'law',
    title: 'Кодекси меҳнати Ҷумҳурии Тоҷикистон',
    detail: 'КМҶ',
    description: 'Қонунгузории меҳнат, ҷадвалҳои кор, истироҳат ва пособиҳои иҷтимоӣ.',
    officialUrl: 'https://normativka-pro.akdt.tj/',
    sourceId: 'normativka',
    status: 'Эътибор дорад',
    fields: [{ label: 'Манбаъ', value: 'Базаи қонунгузорӣ' }],
  },
];

const KINDERGARTEN_DECISIONS: OfficialLegalEntry[] = [
  {
    id: 'kg-decree-256',
    type: 'decision',
    title: 'Қарори Ҳукумати ҶТ №256',
    detail: 'Низомномаи намунавии МДТ',
    description: 'Низомномаи намунавии муассисаи таълимии томактабӣ (29.04.2015).',
    officialUrl: 'https://edu.tj/',
    sourceId: 'edu',
    officialNumber: '№256',
    adoptedAt: '29.04.2015',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Ҳукумати Ҷумҳурии Тоҷикистон' }],
  },
  {
    id: 'kg-decree-113',
    type: 'decision',
    title: 'Қарори Ҳукумати ҶТ №113',
    detail: 'Меъёрҳои музди меҳнат',
    description: 'Меъёрҳои музди меҳнат барои кормандони муассисаҳои таълимии томактабӣ (аз 01.09.2025).',
    officialUrl: 'https://www.president.tj/',
    sourceId: 'president',
    officialNumber: '№113',
    adoptedAt: '28.02.2025',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Ҳукумати Ҷумҳурии Тоҷикистон' }],
  },
  {
    id: 'kg-decree-standard',
    type: 'decision',
    title: 'Стандарти давлатии таҳсилоти томактабӣ',
    detail: 'Тасдиқи Ҳукумати ҶТ',
    description: 'Меъёр ва қоидаҳои муайянгардидаи таълиму тарбияи томактабӣ (моддаи 11, Қонуни №1056).',
    officialUrl: 'https://edu.tj/',
    sourceId: 'edu',
    status: 'Эътибор дорад',
    fields: [{ label: 'Мақом', value: 'Ҳукумати Ҷумҳурии Тоҷикистон' }],
  },
];

const KINDERGARTEN_DOCUMENTS: OfficialLegalEntry[] = [
  {
    id: 'kg-doc-charter',
    type: 'document',
    title: 'Оинномаи МДТМ Мактаб-кӯдакистони №1',
    detail: 'Ҳуҷҷати таъсисӣ',
    description: 'Оиннома мувофиқи Низомномаи намунавии МДТ (Қарори Ҳукумат №256).',
    officialUrl: 'https://edu.tj/',
    sourceId: 'edu',
    status: 'Тасдиқшуда',
  },
  {
    id: 'kg-doc-license',
    type: 'document',
    title: 'Иҷозатномаи фаъолият',
    detail: 'Шуъбаи маорифи ноҳия',
    description: 'Иҷозатнома барои фаъолияти таълимию тарбиявӣ (моддаи 8, Қонуни №1056).',
    officialUrl: 'https://edu.tj/',
    sourceId: 'edu',
    status: 'Эътибор дорад',
  },
  {
    id: 'kg-doc-attestation',
    type: 'document',
    title: 'Аттестатсия ва аккредитатсия',
    detail: 'Назорати давлатӣ',
    description: 'Ҳуҷҷатҳои назорати давлатӣ мувофиқи моддаҳои 9–10, Қонуни «Дар бораи таълиму тарбияи томактабӣ».',
    officialUrl: 'https://edu.tj/',
    sourceId: 'edu',
    status: 'Эътибор дорад',
  },
];

/** Маркази инноватсионӣ — қонунгузории умумии барномасозӣ ва технология */
const HUB_LAWS: OfficialLegalEntry[] = [
  {
    id: 'hub-law-education',
    type: 'law',
    title: 'Қонуни ҶТ «Дар бораи маориф»',
    detail: 'Маориф ва илм',
    description: 'Қонуни умумии маориф — асоси фаъолияти таълимӣ ва илмӣ.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    status: 'Эътибор дорад',
  },
  {
    id: 'hub-law-labor',
    type: 'law',
    title: 'Кодекси меҳнати Ҷумҳурии Тоҷикистон',
    detail: 'КМҶ',
    description: 'Қонунгузории меҳнат барои кормандони маркази барномасозӣ.',
    officialUrl: 'https://normativka-pro.akdt.tj/',
    sourceId: 'normativka',
    status: 'Эътибор дорад',
  },
  {
    id: 'hub-law-food-safety',
    type: 'law',
    title: 'Қонуни ҶТ «Дар бораи бехатарии озуқаворӣ»',
    detail: 'Бехатарии озуқаворӣ',
    description: 'Қонуни амалкунанда дар соҳаи бехатарии озуқаворӣ.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    status: 'Эътибор дорад',
  },
];

const HUB_DECISIONS: OfficialLegalEntry[] = [
  {
    id: 'hub-decree-digital',
    type: 'decision',
    title: 'Қарорҳои Ҳукумати ҶТ оид ба рақамкунонӣ',
    detail: 'Сиёсати давлатӣ',
    description: 'Қарорҳои Ҳукумати Ҷумҳурии Тоҷикистон дар бораи рушди технологияҳои иттилоотӣ.',
    officialUrl: 'https://www.president.tj/',
    sourceId: 'president',
    status: 'Манбаи расмӣ',
  },
  {
    id: 'hub-decree-595',
    type: 'decision',
    title: 'Қарори Ҳукумати ҶТ №595',
    detail: 'Кумитаи бехатарии озуқаворӣ',
    description: 'Қарори Ҳукумат оиди ташкили Кумитаи бехатарии озуқаворӣ.',
    officialUrl: 'https://cfs.tj/',
    sourceId: 'cfs',
    officialNumber: '№595',
    adoptedAt: '29.12.2017',
    status: 'Эътибор дорад',
  },
];

const HUB_DOCUMENTS: OfficialLegalEntry[] = [
  {
    id: 'hub-doc-adliya',
    type: 'document',
    title: 'Базаи қонунгузории Ҷумҳурии Тоҷикистон',
    detail: 'Вазорати адлия',
    description: 'Портали расмии қонунҳо, кодексҳо, қарорҳо ва санадҳои меъёрии ҳуқуқӣ.',
    officialUrl: 'https://www.adliya.tj/',
    sourceId: 'adliya',
    status: 'Манбаи расмӣ',
  },
  {
    id: 'hub-doc-majlisi',
    type: 'document',
    title: 'Қонунҳои қабулшудаи Маҷлиси Оли',
    detail: 'Маҷлиси Оли',
    description: 'Рӯйхати қонунҳои қабулшуда дар сомонаи расмии Маҷлиси Олии Ҷумҳурии Тоҷикистон.',
    officialUrl: 'https://www.majlisioli.tj/tj/legislation/',
    sourceId: 'majlisioli',
    status: 'Манбаи расмӣ',
  },
  {
    id: 'hub-doc-normativka',
    type: 'document',
    title: 'Базаи меъёрҳои ҳуқуқӣ (normativka)',
    detail: 'Агентии назорати давлатӣ',
    description: 'Ҷустуҷӯ ва дастрасӣ ба қонунҳо, қарорҳо ва санадҳои меъёрии ҳуқуқӣ.',
    officialUrl: 'https://normativka-pro.akdt.tj/',
    sourceId: 'normativka',
    status: 'Манбаи расмӣ',
  },
];

export const OFFICIAL_LEGAL_HUB_ID = 'innovation-hub';

const CATALOG_BY_ORG: Record<string, OfficialLegalBundle> = {
  [FOOD_SAFETY_CENTER_ID]: {
    laws: FOOD_SAFETY_LAWS,
    decisions: FOOD_SAFETY_DECISIONS,
    documents: FOOD_SAFETY_DOCUMENTS,
  },
  [KINDERGARTEN_SCHOOL_ID]: {
    laws: KINDERGARTEN_LAWS,
    decisions: KINDERGARTEN_DECISIONS,
    documents: KINDERGARTEN_DOCUMENTS,
  },
  [OFFICIAL_LEGAL_HUB_ID]: {
    laws: HUB_LAWS,
    decisions: HUB_DECISIONS,
    documents: HUB_DOCUMENTS,
  },
};

export const LEGAL_SECTION_SLUGS = {
  laws: 'laws',
  decisions: 'government-decisions',
  documents: 'official-documents',
} as const;

export function getOfficialLegalBundle(organizationId: string): OfficialLegalBundle | null {
  return CATALOG_BY_ORG[organizationId] ?? null;
}

export function getOfficialLegalSource(sourceId: string): OfficialLegalSource | undefined {
  return OFFICIAL_LEGAL_SOURCES.find((source) => source.id === sourceId);
}

export function getAllOfficialLegalOrganizationIds(): string[] {
  return Object.keys(CATALOG_BY_ORG);
}
