import { isValidBik, lookupBankByBik, normalizeBikInput } from '@/lib/nbt-bank-bic';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const bik = request.nextUrl.searchParams.get('bik')?.trim();

  if (!bik) {
    return NextResponse.json({ error: 'BIK required' }, { status: 400 });
  }

  const normalized = normalizeBikInput(bik);
  if (!isValidBik(normalized)) {
    return NextResponse.json({ error: 'Invalid BIK format' }, { status: 400 });
  }

  try {
    const result = await lookupBankByBik(normalized);

    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'NBT BIK lookup failed' }, { status: 502 });
  }
}
