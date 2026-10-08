import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/src/lib/supabase/client";

export const dynamic = "force-dynamic";

// GET all events, with optional filters
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const maxCost = searchParams.get("maxCost");
    const hostID = searchParams.get("hostID");
    const categoryID = searchParams.get("categoryID");

    let query = supabase.from("Event").select("*");

    // Filter by timeframe
    if (startDate) {
      query = query.gte("eventStartTime", startDate);
    }

    if (endDate) {
      query = query.lte("eventEndTime", endDate);
    }

    // Filter by maximum cost
    if (maxCost) {
      query = query.lte("eventCost", Number(maxCost));
    }

    // Filter by event host
    if (hostID) {
      query = query.eq("userID", hostID);
    }

    // Filter by category
    if (categoryID) {
      query = query.eq("categoryID", categoryID);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/events failed:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST a new event
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("Event")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Event created successfully",
        data
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/events failed:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}