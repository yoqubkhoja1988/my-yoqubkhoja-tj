import { NbtBankBicEntry } from '@/lib/nbt-bank-bic';
import { ContractCounterparty } from '@/types/organization-section';

export function normalizeBikInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

export function isValidBik(value: string): boolean {
  const bik = normalizeBikInput(value);
  return /^350\d{6}$/.test(bik);
}

export function applyBicToCounterparty(
  current: ContractCounterparty,
  data: NbtBankBicEntry
): ContractCounterparty {
  return {
    ...current,
    bankBik: data.bik || current.bankBik,
    bankName: data.name || current.bankName,
    correspondentAccount: data.correspondentAccount || current.correspondentAccount,
  };
}

export type BicLookupClientError = 'invalid' | 'not_found' | 'network';

export async function fetchBicLookup(
  bik: string
): Promise<{ ok: true; data: NbtBankBicEntry } | { ok: false; error: BicLookupClientError }> {
  const normalized = normalizeBikInput(bik);
  if (!isValidBik(normalized)) {
    return { ok: false, error: 'invalid' };
  }

  try {
    const res = await fetch(`/api/nbt/bic/lookup?bik=${encodeURIComponent(normalized)}`);
    const data = (await res.json()) as NbtBankBicEntry & { error?: string };

    if (!res.ok) {
      if (res.status === 400) return { ok: false, error: 'invalid' };
      if (res.status === 404) return { ok: false, error: 'not_found' };
      return { ok: false, error: 'network' };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, error: 'network' };
  }
}
