
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

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        url.origin
      )
    );
  }

  console.log("OAuth successful:", data.user?.id);

  return response;
}
