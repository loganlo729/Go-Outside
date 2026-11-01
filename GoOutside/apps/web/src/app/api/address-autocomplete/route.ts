// Next.js API utilities
import { NextRequest, NextResponse } from "next/server";

// --------------------------------------------------
// Address Autocomplete API
// --------------------------------------------------

export async function GET(request: NextRequest) {
  // Get search query
  const query = request.nextUrl.searchParams
    .get("text")
    ?.trim();

  // Require at least 3 characters
  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  // Limit query length
  if (query.length > 150) {
    return NextResponse.json(
      { error: "Search text is too long." },
      { status: 400 }
    );
  }

  // Retrieve API key
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Address autocomplete is not configured." },
      { status: 500 }
    );
  }

  // Configure Geoapify request
  const params = new URLSearchParams({
    text: query,
    format: "json",
    limit: "5",
    lang: "en",
    apiKey,
  });

  try {
    // Fetch address suggestions
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
      {
        cache: "no-store",
      }
    );

    // Check API response
    if (!response.ok) {
      throw new Error("Address provider request failed.");
    }

    // Parse response data
    const data = await response.json();

    // Extract valid addresses
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

    // Return address suggestions
    return NextResponse.json({ results });
  } catch (error) {
    // Log API errors
    console.error("Address autocomplete error:", error);

    // Return failure response
    return NextResponse.json(
      { error: "Unable to retrieve address suggestions." },
      { status: 502 }
    );
  }
}
