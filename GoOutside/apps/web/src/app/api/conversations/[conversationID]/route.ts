import { NextRequest, NextResponse } from 'next/server';
import { db, identity, jsonError, validUUID, failSafe, Ctx } from '../../../../lib/api-server';
export const dynamic = "force-dynamic";
export async function GET(req:NextRequest,ctx:Ctx<'conversationID'>){return failSafe(async()=>{const {conversationID}=await ctx.params;const me=await identity(req);if(!me)return jsonError('Unauthorized',401);if(!validUUID(conversationID))return jsonError('Invalid ID');const {data,error}=await (await db()).from('Conversation').select('*').eq('conversationID',conversationID).eq('createdBy',me).maybeSingle();return error?jsonError(error.message,500):data?NextResponse.json(data):jsonError('Not found or inaccessible',404);});}
