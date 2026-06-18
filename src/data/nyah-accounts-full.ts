/**
 * Нақшаи ягонаи ҳисобҳои баҳисобгирии муҳосибӣ (НЯҲ)
 * дар ташкилоту муассисаҳои буҷетӣ ва хазинадорӣ.
 *
 * Манбаъ: Фармоиши Вазорати молия №173 (26.01.2015),
 * moliya.tj/Admin/Documents/GetFile/515
 *
 * Барои навсозӣ: python scripts/generate-nyah-from-order173.py
 */

import rawAccounts from '@/data/nyah-accounts-full.json';

export type NyahAccountClassId = '1' | '2' | '3' | '4' | '5' | '6' | '7';

export type NyahAccountRecord = {
  code: string;
  classId: NyahAccountClassId;
  name: string;
  nameRu?: string;
  balanceType: 'active' | 'passive' | 'active-passive';
  form3Row?: string;
  form14Row?: string;
  group?: string;
  notes?: string;
};

/** Ҳисобҳои пурраи НЯҲ — 1256 ҳисоб (Фармоиш №173) */
export const NYAH_ACCOUNTS_FULL = rawAccounts as NyahAccountRecord[];
