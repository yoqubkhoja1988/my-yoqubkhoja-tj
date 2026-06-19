/**
 * Каталоги ордерҳои мемориалӣ (М.О. № 1–17) аз шаблони тавозуни холӣ.
 * Барои навсозӣ: python scripts/generate-memorial-orders-catalog.py
 */

import rawCatalog from '@/data/memorial-orders-catalog.json';

export type MemorialOrderOperation = {
  id: string;
  name: string;
  debitAccount: string;
  creditAccount: string;
  basisHint?: string | null;
};

export type MemorialOrderDefinition = {
  id: string;
  number: string;
  sheetName: string;
  title: string;
  operations: MemorialOrderOperation[];
};

export const MEMORIAL_ORDERS_CATALOG = rawCatalog as MemorialOrderDefinition[];

export function memorialOrderById(id: string): MemorialOrderDefinition | undefined {
  return MEMORIAL_ORDERS_CATALOG.find((order) => order.id === id);
}

export function memorialOrderLabel(order: MemorialOrderDefinition): string {
  return `М.О. № ${order.number}`;
}

export function memorialOrderFullTitle(order: MemorialOrderDefinition): string {
  return `${memorialOrderLabel(order)} — ${order.title}`;
}

export type MemorialOrderOperationOverride = Partial<
  Pick<MemorialOrderOperation, 'name' | 'debitAccount' | 'creditAccount' | 'basisHint'>
>;

export function resolveMemorialOperation(
  operation: MemorialOrderOperation,
  overrides?: Record<string, MemorialOrderOperationOverride>
): MemorialOrderOperation {
  const patch = overrides?.[operation.id];
  return patch ? { ...operation, ...patch } : operation;
}
