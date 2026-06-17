import { requireAdmin } from '@/lib/api-guard';
import { buildOrganizationStaffPresets } from '@/lib/staff-position-permissions';
import { getOrganizationSection } from '@/lib/organization-sections-store';
import { readOrganizationsFile } from '@/lib/organizations-store';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const organizationIds = request.nextUrl.searchParams
    .getAll('organizationIds')
    .map((value) => value.trim())
    .filter(Boolean);

  if (organizationIds.length === 0) {
    return NextResponse.json({ organizations: [] });
  }

  const organizations = await readOrganizationsFile();
  const selected = organizations.filter((org) => organizationIds.includes(org.id));

  const results = await Promise.all(
    selected.map(async (org) => {
      const staffContent = await getOrganizationSection(org.id, 'staff');
      return buildOrganizationStaffPresets({
        organizationId: org.id,
        organizationName: org.name,
        staffContent,
      });
    })
  );

  return NextResponse.json({ organizations: results });
}
