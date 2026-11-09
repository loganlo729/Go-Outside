import { NextRequest, NextResponse } from 'next/server';
import { db, jsonError, safeLimit, failSafe } from '../../../lib/api-server';
export async function GET(req: NextRequest) {
 return failSafe(async () => {
  const u = new URL(req.url); const query = (u.searchParams.get('query') ?? '').trim();
  const stateCode = (u.searchParams.get('stateCode') ?? '').trim().toUpperCase();
  let q = (await db()).from('Location').select('*');
  if (query) q = q.ilike('locationName', `%${query.replace(/[%_,]/g, '')}%`);
  if (stateCode) q = q.eq('stateCode', stateCode);
  const {data,error} = await q.order('locationName').limit(safeLimit(req));
  return error ? jsonError('Database query failed',500) : NextResponse.json(data ?? []);
 });
}
