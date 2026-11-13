import { NextRequest, NextResponse } from 'next/server';
import { db, jsonError, failSafe, Ctx } from '../../../../lib/api-server';
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, ctx: Ctx<'id'>) {
  return failSafe(async () => {
    const id = (await ctx.params).id;
    if (!/^\d+$/.test(id)) return jsonError("Invalid ID");
    const { data, error } = await (await db()).from('Location').select('*').eq("id", Number(id)).maybeSingle();
    if (error) return jsonError('Database query failed', 500);
    return data ? NextResponse.json(data) : jsonError('Not found', 404);
  });
}
