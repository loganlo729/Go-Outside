
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
    .get("text")
    ?.trim();

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  if (query.length > 150) {
    return NextResponse.json(
      { error: "Search text is too long." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Address autocomplete is not configured." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    text: query,
    format: "json",
    limit: "5",
    lang: "en",
    apiKey,
  });

  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Address provider request failed.");
    }

    const data = await response.json();

    const results = (data.results ?? [])
      .filter(
        (result: { formatted?: string }) =>
          typeof result.formatted === "string"
      )
      .map(
        (result: {
          formatted: string;
          lat?: number;
          lon?: number;
        }) => ({
          formatted: result.formatted,
          lat: result.lat,
          lon: result.lon,
        })
      );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Address autocomplete error:", error);

    return NextResponse.json(
      { error: "Unable to retrieve address suggestions." },
      { status: 502 }
    );
  }
}
