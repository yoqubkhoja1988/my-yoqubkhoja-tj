/**
 * Нақшаи ягонаи ҳисобҳои баҳисобгирии муҳосибӣ (НЯҲ)
 * дар ташкилоту муассисаҳои буҷетӣ ва хазинадорӣ.
 *
 * Асос: Дастурамал №204 (09.04.2015), Вазорати молияи ҶТ (СҲМБДТ).
 */

import {
  NYAH_ACCOUNTS_FULL,
  NyahAccountClassId,
  NyahAccountRecord,
} from '@/data/nyah-accounts-full';

export type { NyahAccountClassId, NyahAccountRecord };

export const NYAH_INSTRUCTION = {
  number: '№204',
  date: '09.04.2015',
  issuer: 'Вазорати молияи Ҷумҳурии Тоҷикистон (СҲМБДТ)',
  standard: 'Стандартҳои ҳисоботи молиявии давлатӣ (СҲМБДТ)',
} as const;

export const NYAH_LEGAL_BASIS = [
  'Қонуни ҶТ «Дар бораи бухгалтерии ҳисобот ва ҳисоботи молиявӣ»',
  'Дастурамал оид ба тартиби тартиб додани ҳисоботҳои молиявӣ №204 (09.04.2015)',
  'Нақшаи ягонаи ҳисобҳои баҳисобгирии муҳосибӣ (НЯҲ) дар ташкилоту муассисаҳои буҷетӣ ва хазинадорӣ',
  'Гурӯҳбандии иқтисодии буҷет (Вазорати молия)',
  'Фармоиши Вазорати молия №173 (26.01.2015) — НЯҲ барои ташкилотҳои буҷетӣ',
] as const;

export type NyahAccount = NyahAccountRecord & {
  /** @deprecated Истифодаи `name` — барои мувофиқат бо версияи қадим */
  nameKey?: string;
};

export type NyahAccountClass = {
  id: NyahAccountClassId;
  nameKey: string;
  descriptionKey: string;
};

export const NYAH_ACCOUNT_CLASSES: NyahAccountClass[] = [
  {
    id: '1',
    nameKey: 'nyahClass1Name',
    descriptionKey: 'nyahClass1Desc',
  },
  {
    id: '2',
    nameKey: 'nyahClass2Name',
    descriptionKey: 'nyahClass2Desc',
  },
  {
    id: '3',
    nameKey: 'nyahClass3Name',
    descriptionKey: 'nyahClass3Desc',
  },
  {
    id: '4',
    nameKey: 'nyahClass4Name',
    descriptionKey: 'nyahClass4Desc',
  },
  {
    id: '5',
    nameKey: 'nyahClass5Name',
    descriptionKey: 'nyahClass5Desc',
  },
  {
    id: '6',
    nameKey: 'nyahClass6Name',
    descriptionKey: 'nyahClass6Desc',
  },
  {
    id: '7',
    nameKey: 'nyahClass7Name',
    descriptionKey: 'nyahClass7Desc',
  },
];

/** Ҳисобҳои пурраи НЯҲ */
export const NYAH_ACCOUNTS: NyahAccount[] = NYAH_ACCOUNTS_FULL;

/** Даромад аз фурӯши мол/хизматрасонии муассисаҳои ғайрибозаргонӣ (Фармоиш №173, мисолҳои 4 42 300) */
export const NYAH_EXTRA_BUDGET_REVENUE_ACCOUNT = '4 42 300';
export const NYAH_PARENT_FOOD_REVENUE_ACCOUNT = NYAH_EXTRA_BUDGET_REVENUE_ACCOUNT;
export const NYAH_PARENT_MEMBERSHIP_REVENUE_ACCOUNT = NYAH_EXTRA_BUDGET_REVENUE_ACCOUNT;
export const NYAH_PRODUCT_SALE_REVENUE_ACCOUNT = NYAH_EXTRA_BUDGET_REVENUE_ACCOUNT;
export const NYAH_FOOD_INVENTORY_ACCOUNT = '1 31 214';
export const NYAH_CASH_ACCOUNT = '1 11 110';
export const NYAH_BANK_ACCOUNT = '1 11 254';
export const NYAH_FOOD_EXPENSE_ACCOUNT = '5 12 150';
export const NYAH_PAYROLL_EXPENSE_ACCOUNT = '5 10 100';
export const NYAH_PAYROLL_PAYABLE_ACCOUNT = '2 11 510';
export const NYAH_SUPPLIER_PAYABLE_ACCOUNT = '2 11 110';
export const NYAH_DEPRECIATION_EXPENSE_ACCOUNT = '5 13 100';
export const NYAH_ACCUMULATED_DEPRECIATION_ACCOUNT = '1 42 300';
export const NYAH_BUDGET_DEFERRED_REVENUE_LOCAL = '2 11 972';
export const NYAH_TREASURY_INTERNAL_LIABILITY = '2 11 950';
export const NYAH_GRANT_REVENUE_ACCOUNT = '4 18 310';
export const NYAH_SOCIAL_TAX_PAYABLE_ACCOUNT = '2 11 660';
export const NYAH_INCOME_TAX_PAYABLE_ACCOUNT = '2 11 670';
export const NYAH_CONSUMABLES_EXPENSE_ACCOUNT = '5 12 000';
export const NYAH_COST_OF_GOODS_SOLD_ACCOUNT = '5 12 180';
export const NYAH_FINISHED_PRODUCTS_ACCOUNT = '1 31 230';
export const NYAH_CONSUMABLES_INVENTORY_ACCOUNT = '1 31 212';
export const NYAH_FIXED_ASSETS_ACCOUNT = '1 41 300';

export function findNyahAccount(code: string): NyahAccount | undefined {
  const normalized = normalizeAccountCode(code);
  return NYAH_ACCOUNTS.find((item) => normalizeAccountCode(item.code) === normalized);
}

export function isValidNyahAccountCode(code: string): boolean {
  return findNyahAccount(code) !== undefined;
}

export function normalizeAccountCode(code: string): string {
  return code.replace(/\s+/g, ' ').trim();
}

export function accountsByClass(classId?: NyahAccountClassId): NyahAccount[] {
  if (!classId) return NYAH_ACCOUNTS;
  return NYAH_ACCOUNTS.filter((item) => item.classId === classId);
}

export function resolveNyahAccountName(
  account: NyahAccount,
  locale?: string,
  t?: (key: string) => string
): string {
  if (locale === 'ru' && account.nameRu) return account.nameRu;
  if (account.name) return account.name;
  if (account.nameKey && t) return t(account.nameKey);
  return account.code;
}

export function isSyntheticNyahAccount(code: string): boolean {
  return normalizeAccountCode(code).endsWith(' 000');
}

export function searchNyahAccounts(query: string): NyahAccount[] {
  const q = query.trim().toLowerCase();
  if (!q) return NYAH_ACCOUNTS;
  return NYAH_ACCOUNTS.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      (item.nameRu?.toLowerCase().includes(q) ?? false) ||
      (item.notes?.toLowerCase().includes(q) ?? false)
  );
}

export function nyahAccountsByGroup(classId: NyahAccountClassId): Map<string, NyahAccount[]> {
  const map = new Map<string, NyahAccount[]>();
  for (const account of accountsByClass(classId)) {
    const group = account.group ?? account.code.slice(0, 5);
    const list = map.get(group) ?? [];
    list.push(account);
    map.set(group, list);
  }
  return map;
}
