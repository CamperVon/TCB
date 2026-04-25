import { NextRequest, NextResponse } from 'next/server';
import { lookupByImdbId } from '@/lib/tmdb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ imdbId: string }> }) {
  const { imdbId } = await params;
  if (!imdbId) return NextResponse.json({ error: 'IMDb ID required' }, { status: 400 });

  try {
    const result = await lookupByImdbId(imdbId);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 });
  }
}
