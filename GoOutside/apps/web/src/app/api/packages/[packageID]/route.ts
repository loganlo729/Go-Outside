import { NextRequest, NextResponse } from 'next/server';
import { db, jsonError, failSafe, Ctx } from '../../../../lib/api-server';
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, ctx: Ctx<'packageID'>) {
  return failSafe(async () => {
    const id = (await ctx.params).packageID;

    const { data, error } = await (await db()).from('Package').select('*').eq("packageID", id).maybeSingle();
    if (error) return jsonError('Database query failed', 500);
    return data ? NextResponse.json(data) : jsonError('Not found', 404);
  });
}
