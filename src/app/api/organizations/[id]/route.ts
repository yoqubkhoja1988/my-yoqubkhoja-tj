import {
  deleteOrganizationById,
  readOrganizationsFile,
  upsertOrganization,
} from '@/lib/organizations-store';
import { requireAdmin, requireSession } from '@/lib/api-guard';
import {
  canAccessOrganization,
} from '@/lib/user-access';
import { Organization } from '@/types/organization';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const organization = (await readOrganizationsFile()).find((item) => item.id === id);

  if (!organization) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!canAccessOrganization(session, id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(organization);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  try {
    const body = (await request.json()) as Partial<Organization>;
    const organizations = await readOrganizationsFile();
    const index = organizations.findIndex((item) => item.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    organizations[index] = {
      ...organizations[index],
      ...body,
      id,
      name: body.name?.trim() || organizations[index].name,
      description:
        body.description !== undefined
          ? typeof body.description === 'string'
            ? body.description.trim()
            : organizations[index].description
          : organizations[index].description,
    };

    await upsertOrganization(organizations[index]);
    return NextResponse.json(organizations[index]);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const organization = (await readOrganizationsFile()).find((item) => item.id === id);
  if (!organization) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const deleted = await deleteOrganizationById(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
