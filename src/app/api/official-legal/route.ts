import { auth } from '@/auth';
import {
  getOfficialLegalBundle,
  getOfficialLegalSource,
  OFFICIAL_LEGAL_HUB_ID,
  OFFICIAL_LEGAL_SOURCES,
} from '@/lib/official-legal-catalog';
import {
  ensureOfficialLegalSectionsSeeded,
  syncAllOfficialLegal,
  verifyOfficialUrls,
} from '@/lib/official-legal-sync';
import { requireAdmin } from '@/lib/api-guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizationId =
    request.nextUrl.searchParams.get('organizationId') ?? OFFICIAL_LEGAL_HUB_ID;

  await ensureOfficialLegalSectionsSeeded();

  const bundle = getOfficialLegalBundle(organizationId);
  if (!bundle) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  return NextResponse.json({
    organizationId,
    sources: OFFICIAL_LEGAL_SOURCES,
    laws: bundle.laws.map((entry) => ({
      ...entry,
      source: getOfficialLegalSource(entry.sourceId),
    })),
    decisions: bundle.decisions.map((entry) => ({
      ...entry,
      source: getOfficialLegalSource(entry.sourceId),
    })),
    documents: bundle.documents.map((entry) => ({
      ...entry,
      source: getOfficialLegalSource(entry.sourceId),
    })),
  });
}

export async function POST(request: NextRequest) {
  const adminSession = await requireAdmin();
  if (adminSession instanceof NextResponse) return adminSession;

  const body = (await request.json().catch(() => ({}))) as {
    action?: 'sync' | 'verify';
    organizationId?: string;
  };

  if (body.action === 'verify' && body.organizationId) {
    const results = await verifyOfficialUrls(body.organizationId);
    return NextResponse.json({ results });
  }

  const synced = await syncAllOfficialLegal();
  return NextResponse.json({ synced });
}
