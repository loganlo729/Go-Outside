import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('Event')
    .select('*')
    .eq('eventID', id);

  return NextResponse.json({
    id,
    data,
    error,
  });
}