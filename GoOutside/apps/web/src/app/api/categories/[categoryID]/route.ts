import { NextRequest, NextResponse } from 'next/server';
import { db, jsonError, failSafe, Ctx } from '../../../../lib/api-server';
export async function GET(_req: NextRequest, ctx: Ctx<'categoryID'>) {
  return failSafe(async () => {
    const id = (await ctx.params).categoryID;

    const { data, error } = await (await db()).from('Category').select('*').eq("categoryID", id).maybeSingle();
    if (error) return jsonError('Database query failed', 500);
    return data ? NextResponse.json(data) : jsonError('Not found', 404);
  });
}
