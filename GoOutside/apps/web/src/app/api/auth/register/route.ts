import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import type { NextRequest } from "next/server";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password, username, accountType } = body;
    const normalizedUsername = typeof username === "string" ? username.trim() : "";

    // Validate required fields
    if (!email || !password || !normalizedUsername) {
      return NextResponse.json(
        { error: "Email, password, and username are required." },
        { status: 400 }
      );
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return NextResponse.json(
        { error: "Username must be 3–30 letters, numbers, or underscores." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data: existingUser, error: lookupError } = await supabase
      .from("User")
      .select("userID")
      .ilike("username", normalizedUsername)
      .limit(1);

    if (lookupError) {
      return NextResponse.json(
        { error: "Unable to validate username availability." },
        { status: 500 }
      );
    }

    if (existingUser?.length) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }

    // Create the Supabase Auth account and retain the username in auth metadata.
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: normalizedUsername } },
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
        username: normalizedUsername,
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
