import { NextResponse } from 'next/server';
import { sseManager } from '@/lib/sseManager';

export async function GET() {
  return NextResponse.json(sseManager.stats());
}