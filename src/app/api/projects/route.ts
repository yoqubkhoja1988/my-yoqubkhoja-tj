import { readFileSync } from 'fs';
import { NextResponse } from 'next/server';
import { join } from 'path';

export async function GET() {
  try {
    const file = join(process.cwd(), 'data', 'projects.json');
    const projects = JSON.parse(readFileSync(file, 'utf-8'));
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json([]);
  }
}
