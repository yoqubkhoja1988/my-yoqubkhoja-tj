import { requireSession } from '@/lib/api-guard';
import {
  translateUserContent,
  translateUserContentBatch,
} from '@/lib/user-content-translate';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const text = request.nextUrl.searchParams.get('text');
  const to = request.nextUrl.searchParams.get('to');

  if (!text || !to) {
    return NextResponse.json({ error: 'text and to required' }, { status: 400 });
  }

  const translated = await translateUserContent(text, to);
  return NextResponse.json({ text: translated });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  let body: { texts?: string[]; to?: string };
  try {
    body = (await request.json()) as { texts?: string[]; to?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { texts, to } = body;
  if (!to || !Array.isArray(texts)) {
    return NextResponse.json({ error: 'texts and to required' }, { status: 400 });
  }

  const limited = texts.slice(0, 40);
  const translated = await translateUserContentBatch(limited, to);
  return NextResponse.json({ texts: translated });
}
