import {
  readOrganizationsFile,
  writeOrganizationsFile,
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
  const organization = readOrganizationsFile().find((item) => item.id === id);

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
    const organizations = readOrganizationsFile();
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

    writeOrganizationsFile(organizations);
    return NextResponse.json(organizations[index]);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const organizations = readOrganizationsFile();
  const filtered = organizations.filter((item) => item.id !== id);

  if (filtered.length === organizations.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  writeOrganizationsFile(filtered);
  return NextResponse.json({ ok: true });
}
