import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password, accountType } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Create the Supabase Auth account
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    

    if (!authData.user) {
      return NextResponse.json(
        { error: "Account could not be created." },
        { status: 500 }
      );
    }

    // Create matching application User record
    const { error: userError } = await supabase
      .from("User")
      .insert({
        userID: authData.user.id,
        dateJoined: new Date().toISOString(),
        accountType: accountType ?? "User",
      });

    if (userError) {
      return NextResponse.json(
        {
          error: "Auth account created, but user record failed.",
          details: userError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: authData.user.id,
          email: authData.user.email,
          accountType: accountType ?? "User",
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}