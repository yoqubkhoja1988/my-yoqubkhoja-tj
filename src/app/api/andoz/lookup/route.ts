import { lookupOrganizationByRma } from '@/lib/andoz';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const rma = request.nextUrl.searchParams.get('rma')?.trim();

  if (!rma) {
    return NextResponse.json({ error: 'RMA required' }, { status: 400 });
  }

  if (!/^\d{9,12}$/.test(rma.replace(/\D/g, ''))) {
    return NextResponse.json({ error: 'Invalid RMA format' }, { status: 400 });
  }

  try {
    const result = await lookupOrganizationByRma(rma);

    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Andoz lookup failed' }, { status: 502 });
  }
}
