import { NextResponse } from 'next/server';
import { db, jsonError, failSafe } from '../../../lib/api-server';
export const dynamic = "force-dynamic";
export async function GET() {
  return failSafe(async () => {
    const { data, error } = await (await db()).from('Category').select('*').order('categoryName');
    return error ? jsonError('Database query failed', 500) : NextResponse.json(data ?? []);
  });
}
