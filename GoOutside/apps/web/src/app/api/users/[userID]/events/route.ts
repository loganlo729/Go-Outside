import { NextRequest, NextResponse } from 'next/server';
import { db, jsonError, validUUID, failSafe, Ctx } from '../../../../../lib/api-server';
export async function GET(_req:NextRequest,ctx:Ctx<'userID'>){return failSafe(async()=>{const {userID}=await ctx.params;if(!validUUID(userID))return jsonError('Invalid user ID');const {data,error}=await (await db()).from('RSVP').select('rsvpID,rsvpStatus,rsvpDate,Event(*)').eq('userID',userID);return error?jsonError(error.message,500):NextResponse.json(data??[]);});}
