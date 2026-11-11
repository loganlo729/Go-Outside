import { NextRequest, NextResponse } from 'next/server';
import { db, identity, bodyObject, pick, jsonError, safeLimit, failSafe, validUUID } from '../../../lib/api-server';
const writable = ['categoryID','eventTitle','eventDescription','eventStartTime','eventEndTime','eventLocation','eventCost','status','eventImageURL'] as const;
export async function GET(req: NextRequest) {
 return failSafe(async () => {
  const u = new URL(req.url).searchParams;
  let q = (await db()).from('Event').select('*');
  if (u.has('startDate')) q=q.gte('eventStartTime',u.get('startDate')!);
  if (u.has('endDate')) q=q.lte('eventEndTime',u.get('endDate')!);
  if (u.has('maxCost')) {const n=Number(u.get('maxCost'));if(!Number.isFinite(n)||n<0)return jsonError('Invalid maxCost');q=q.lte('eventCost',n);}
  if (u.has('hostID')) {if(!validUUID(u.get('hostID')!))return jsonError('Invalid hostID');q=q.eq('userID',u.get('hostID')!);}
  if (u.has('categoryID')) {if(!validUUID(u.get('categoryID')!))return jsonError('Invalid categoryID');q=q.eq('categoryID',u.get('categoryID')!);}
  const {data,error}=await q.order('eventStartTime',{ascending:true}).limit(safeLimit(req));
  return error ? jsonError(error.message,500) : NextResponse.json(data??[]);
 });
}
export async function POST(req: NextRequest) {
 return failSafe(async () => {
  const me=await identity(req);if(!me)return jsonError('Unauthorized',401);
  const input=await bodyObject(req);if(!input)return jsonError('Invalid JSON body');
  if (input.userID && input.userID !== me) return jsonError('Cannot create events for another user',403);
  if (typeof input.eventTitle!=='string'||!input.eventTitle.trim()||typeof input.eventStartTime!=='string'||typeof input.eventEndTime!=='string'||typeof input.eventLocation!=='string')return jsonError('Missing required event fields');
  if (Date.parse(input.eventEndTime)<=Date.parse(input.eventStartTime))return jsonError('Event end must be after start');
  const values={...pick(input,writable),userID:me};
  const {data,error}=await (await db()).from('Event').insert(values).select().single();
  return error ? jsonError(error.message,400) : NextResponse.json(data,{status:201});
 });
}
