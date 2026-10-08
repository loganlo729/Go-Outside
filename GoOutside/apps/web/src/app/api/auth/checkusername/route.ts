import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/src/lib/supabase/client";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim() ?? "";

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–30 letters, numbers, or underscores." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("User")
    .select("userID")
    .ilike("username", username)
    .limit(1);

  if (error) {
    return NextResponse.json(
      { error: "Unable to check username availability." },
      { status: 500 }
    );
  }

  return NextResponse.json({ available: data.length === 0 });
}
