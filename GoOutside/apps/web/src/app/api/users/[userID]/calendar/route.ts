import { NextRequest, NextResponse } from 'next/server';
import { db, jsonError, validUUID, failSafe, Ctx, identity } from '../../../../../lib/api-server';

export async function GET(
  req: NextRequest,
  ctx: Ctx<'userID'>
) {
  return failSafe(async () => {
    const { userID } = await ctx.params;

    if (!validUUID(userID)) {
      return jsonError('Invalid user ID', 400);
    }

    const me = await identity(req);

    if (!me) return jsonError('Unauthorized', 401);
    if (me !== userID) return jsonError('Forbidden', 403);

    const database = await db();

    // Fetch events created by this user
    const { data: createdEvents, error: createdError } =
      await database
        .from('Event')
        .select('*')
        .eq('userID', userID);

    if (createdError) {
      return jsonError(createdError.message, 500);
    }

    // Fetch RSVP records for this user
    const { data: rsvps, error: rsvpError } =
      await database
        .from('RSVP')
        .select('eventID')
        .eq('userID', userID);

    if (rsvpError) {
      return jsonError(rsvpError.message, 500);
    }

    const rsvpIDs = [
      ...new Set(
        (rsvps ?? [])
          .map(r => r.eventID)
          .filter((id): id is string => typeof id === 'string')
      ),
    ];

    // Fetch the events referenced by the user's RSVPs
    let rsvpEvents: NonNullable<typeof createdEvents> = [];

    if (rsvpIDs.length > 0) {
      const { data, error } = await database
        .from('Event')
        .select('*')
        .in('eventID', rsvpIDs);

      if (error) {
        return jsonError(error.message, 500);
      }

      rsvpEvents = data ?? [];
    }

    // Merge and deduplicate events
    const events = new Map<
      string,
      (typeof rsvpEvents)[number] & {
        isHost: boolean;
        isRSVP: boolean;
      }
    >();

    for (const event of createdEvents ?? []) {
      events.set(event.eventID, {
        ...event,
        isHost: true,
        isRSVP: rsvpIDs.includes(event.eventID),
      });
    }

    for (const event of rsvpEvents) {
      if (!events.has(event.eventID)) {
        events.set(event.eventID, {
          ...event,
          isHost: false,
          isRSVP: true,
        });
      }
    }

    return NextResponse.json([...events.values()]);
  });
}
