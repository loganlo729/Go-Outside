import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

// GET a single event by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("Event")
      .select("*")
      .eq("eventID", params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/events/[id] failed:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH an existing event
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("Event")
      .update(body)
      .eq("eventID", params.id)
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
        message: "Event updated successfully",
        data
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/events/[id] failed:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE an event
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("Event")
      .delete()
      .eq("eventID", params.id)
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
        message: `Deleted ${params.id} successfully`,
        data
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/events/[id] failed:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}