import { NextRequest, NextResponse } from 'next/server';
import { db, identity, bodyObject, pick, jsonError, validUUID, failSafe, Ctx } from '../../../../lib/api-server';
const fields = ['username','profilePicturePath','bio','displayName','bannerPath','stateCode','osmID','locationID'] as const;
export async function GET(req: NextRequest, ctx: Ctx<'userID'>) {
 return failSafe(async () => {
  const {userID} = await ctx.params;
  if (!validUUID(userID)) return jsonError('Invalid user ID');
  const me = await identity(req);
  const columns = me === userID ? '*' : 'profile,userID,username,profilePicturePath,bio,displayName,bannerPath,stateCode,osmID,locationID';
  const {data,error} = await (await db()).from('Profile').select(columns).eq('userID',userID).maybeSingle();
  return error ? jsonError('Database query failed',500) : data ? NextResponse.json(data) : jsonError('Not found',404);
 });
}
export async function PATCH(req: NextRequest, ctx: Ctx<'userID'>) {
 return failSafe(async () => {
  const {userID} = await ctx.params; const me = await identity(req);
  if (!me) return jsonError('Unauthorized',401);
  if (me !== userID) return jsonError('Forbidden',403);
  const input = await bodyObject(req); if (!input) return jsonError('Invalid JSON body');
  const values = pick(input,fields); if (!Object.keys(values).length) return jsonError('No valid fields');
  if (values.locationID != null) {
    if (!Number.isInteger(values.locationID) || Number(values.locationID) < 1) return jsonError('Invalid locationID');
    const {data,error} = await (await db()).from('Location').select('id,stateCode,osmID').eq('id',values.locationID).maybeSingle();
    if (error) return jsonError('Location lookup failed',500);
    if (!data) return jsonError('Unknown locationID');
    values.stateCode = data.stateCode; values.osmID = data.osmID;
  }
  const {data,error} = await (await db()).from('Profile').update(values).eq('userID',userID).select().maybeSingle();
  return error ? jsonError(error.message,400) : data ? NextResponse.json(data) : jsonError('Not found',404);
 });
}
