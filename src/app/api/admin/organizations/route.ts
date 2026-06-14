import { requireAdmin } from '@/lib/api-guard';
import { readOrganizationsFile } from '@/lib/organizations-store';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const organizations = await readOrganizationsFile();
  const items = organizations
    .map(({ id, name, rma, sector, status }) => ({
      id,
      name,
      rma: rma ?? null,
      sector: sector ?? null,
      status: status ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tg'));

  return NextResponse.json({ organizations: items, total: items.length });
}
