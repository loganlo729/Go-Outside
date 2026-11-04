import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: auth, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !auth.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "GoOutside <welcome@yourdomain.com>",
      to: [auth.user.email],
      subject: "Welcome to GoOutside!",
      html: `
        <h1>Welcome to GoOutside!</h1>
        <p>Thanks for joining our community.</p>
        <p>Get ready to discover events, meet people,
        and explore new experiences.</p>
        <p>We're glad you're here!</p>
      `,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      id: data?.id,
    });
  } catch (error) {
    console.error("Welcome email error:", error);

    return NextResponse.json(
      { error: "Unable to send welcome email." },
      { status: 500 }
    );
  }
}