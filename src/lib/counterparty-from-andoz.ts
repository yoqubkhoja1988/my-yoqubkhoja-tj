import { AndozLookupResult } from '@/lib/andoz';
import { ContractCounterparty } from '@/types/organization-section';

export function normalizeRmaInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidRma(value: string): boolean {
  const digits = normalizeRmaInput(value);
  return digits.length >= 9 && digits.length <= 12;
}

export function applyAndozToCounterparty(
  current: ContractCounterparty,
  data: AndozLookupResult
): ContractCounterparty {
  const addressParts = [data.address, data.taxDistrict].filter(Boolean);

  return {
    ...current,
    tin: data.rma || current.tin,
    name: data.name || current.name,
    address: addressParts.length > 0 ? addressParts.join(', ') : current.address,
    director: data.director || current.director,
    phone: data.phone || data.directorPhone || current.phone,
    legalForm: data.status || current.legalForm,
  };
}

export type AndozLookupClientError = 'invalid' | 'not_found' | 'network';

export async function fetchAndozLookup(
  rma: string
): Promise<
  | { ok: true; data: AndozLookupResult }
  | { ok: false; error: AndozLookupClientError }
> {
  const normalized = normalizeRmaInput(rma);
  if (!isValidRma(normalized)) {
    return { ok: false, error: 'invalid' };
  }

  try {
    const res = await fetch(`/api/andoz/lookup?rma=${encodeURIComponent(normalized)}`);
    const data = (await res.json()) as AndozLookupResult & { error?: string };

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
