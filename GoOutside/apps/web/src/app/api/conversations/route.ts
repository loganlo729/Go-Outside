import { NextRequest, NextResponse } from 'next/server';
import { db, identity, jsonError, failSafe } from '../../../lib/api-server';
export async function GET(req:NextRequest){return failSafe(async()=>{const me=await identity(req);if(!me)return jsonError('Unauthorized',401);const {data,error}=await (await db()).from('Conversation').select('*').eq('createdBy',me).order('createdDate',{ascending:false});return error?jsonError(error.message,500):NextResponse.json(data??[]);});}
