import { NextRequest, NextResponse } from 'next/server';
import { createClient } from './supabase/server';

// Reuses the project's cookie-aware Supabase SSR client; queries respect RLS.
export async function db() {
  return createClient();
}
export const jsonError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

// Authentication is based on the existing Supabase cookie session.
export async function identity(_req: NextRequest): Promise<string | null> {
  const client = await db();
  const { data, error } = await client.auth.getUser();
  return error ? null : (data.user?.id ?? null);
}
export async function bodyObject(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await req.json();
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch { return null; }
}
export function pick(value: Record<string, unknown>, fields: readonly string[]) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => fields.includes(key)));
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validUUID(id: string) { return UUID.test(id); }
export function safeLimit(req: NextRequest, fallback = 50, maximum = 100) {
  const raw = Number(new URL(req.url).searchParams.get('limit') ?? fallback);
  return Number.isInteger(raw) && raw > 0 ? Math.min(raw, maximum) : fallback;
}
export async function failSafe(fn: () => Promise<Response>): Promise<Response> {
  try { return await fn(); }
  catch (error) { console.error('API error:', error); return jsonError('Internal server error', 500); }
}
export type Ctx<T extends string> = { params: Promise<Record<T, string>> };
