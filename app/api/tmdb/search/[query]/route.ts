import { NextRequest, NextResponse } from 'next/server';
import { searchByName } from '@/lib/tmdb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ query: string }> }) {
  const { query } = await params;
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  try {
    const result = await searchByName(decodeURIComponent(query));
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Search failed' }, { status: 500 });
  }
}
