// REVIEW BEFORE USE: Existing registration may already implement a secure database trigger.
// This route uses Supabase signUp (email confirmation behavior follows Supabase settings).
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { bodyObject, jsonError, failSafe } from '../../../../lib/api-server';
export async function POST(req:NextRequest){return failSafe(async()=>{
 const input=await bodyObject(req);if(!input)return jsonError('Invalid JSON body');
 const {email,password,username}=input;
 if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<6||typeof username!=='string'||! /^[A-Za-z0-9_]{3,30}$/.test(username))return jsonError('Invalid account details');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!anon)return jsonError('Missing Supabase configuration',500);
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.signUp({email,password,options:{data:{username}}});
 if(error)return jsonError(error.message,400);
 // A database trigger should provision User/Profile. Never return session tokens in this response.
 return NextResponse.json({userID:data.user?.id ?? null,emailConfirmationRequired:!data.session},{status:201});
});}
