import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/src/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { userID: string } }
) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("RSVP")
      .select(`
        rsvpID,
        userID,
        eventID,
        rsvpStatus,
        rsvpDate,
        Event (*)
      `)
      .eq("userID", params.userID);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("GET RSVP events failed:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}