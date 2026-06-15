import { requireAdmin } from '@/lib/api-guard';
import { getAdminDocBySlug, getAdminDocPath } from '@/lib/admin-internal-docs';
import { readFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';

const MIME_TYPES: Record<'pdf' | 'html', string> = {
  pdf: 'application/pdf',
  html: 'text/html; charset=utf-8',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { slug } = await params;
  const doc = getAdminDocBySlug(slug);
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(getAdminDocPath(doc.file));
    const filename = doc.file.split('/').pop() ?? doc.slug;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': MIME_TYPES[doc.format],
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
