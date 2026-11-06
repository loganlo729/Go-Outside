
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const requestedNext =
    url.searchParams.get("next") ?? "/complete-profile";

  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.startsWith("/\\")
      ? requestedNext
      : "/complete-profile";

  if (!code) {
    console.error("OAuth callback: missing authorization code");

    return NextResponse.redirect(
      new URL("/login?error=missing_code", url.origin)
    );
  }

  const response = NextResponse.redirect(
    new URL(next, url.origin)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth exchange failed:", error.message);

    const errorResponse = NextResponse.redirect(
      new URL("/login?error=oauth_failed", url.origin)
    );

    // Preserve any cookies set during the exchange.
    response.cookies.getAll().forEach((cookie) => {
      errorResponse.cookies.set(cookie);
    });

    return errorResponse;
  }

  console.log("OAuth successful:", {
    userId: data.user?.id,
    redirectingTo: next,
  });

  return response;
}
