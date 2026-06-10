import { auth } from '@/auth';
import {
  readOrganizationsFile,
  writeOrganizationsFile,
} from '@/lib/organizations-store';
import { filterOrganizationsForSession } from '@/lib/user-access';
import { requireAdmin, requireSession } from '@/lib/api-guard';
import { Organization } from '@/types/organization';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const organizations = filterOrganizationsForSession(session, readOrganizationsFile());
  return NextResponse.json(organizations);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await request.json()) as Partial<Organization>;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    const organizations = readOrganizationsFile();
    const newOrganization: Organization = {
      id: body.id || randomUUID(),
      name: body.name.trim(),
      description: body.description?.trim() || '',
      createdAt: body.createdAt || new Date().toISOString(),
      ...(body.rma ? { rma: body.rma } : {}),
      ...(body.ryam ? { ryam: body.ryam } : {}),
      ...(body.address ? { address: body.address } : {}),
      ...(body.director ? { director: body.director } : {}),
      ...(body.chiefAccountant ? { chiefAccountant: body.chiefAccountant } : {}),
      ...(body.directorPhone ? { directorPhone: body.directorPhone } : {}),
      ...(body.chiefAccountantPhone
        ? { chiefAccountantPhone: body.chiefAccountantPhone }
        : {}),
      ...(body.phone ? { phone: body.phone } : {}),
      ...(body.taxDistrict ? { taxDistrict: body.taxDistrict } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.registeredAt ? { registeredAt: body.registeredAt } : {}),
    };

    if (organizations.some((item) => item.id === newOrganization.id)) {
      return NextResponse.json({ error: 'Already exists' }, { status: 409 });
    }

    organizations.push(newOrganization);
    writeOrganizationsFile(organizations);
    return NextResponse.json(newOrganization, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
