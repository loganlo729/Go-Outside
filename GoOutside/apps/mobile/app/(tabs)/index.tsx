
import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AppButton from "../../src/components/ui/AppButton";
import Screen from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";

type CalendarEvent = {
  eventID: string;
  eventTitle: string;
  eventStartTime: string;
  eventEndTime?: string | null;
  isHost: boolean;
  isRSVP: boolean;
};

type Filter = "all" | "created" | "rsvp";

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<Filter>("all");

  // Fetch the user's created and RSVP'd events.
  
  const loadEvents = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        setIsLoggedIn(false);
        setEvents([]);
        return;
      }

      setIsLoggedIn(true);

      const userID = session.user.id;

      // Events created by this user
      const { data: createdEvents, error: createdError } =
        await supabase
          .from("Event")
          .select("eventID, eventTitle, eventStartTime, eventEndTime")
          .eq("userID", userID);

      if (createdError) throw createdError;

      // Events this user RSVP'd to
      const { data: rsvps, error: rsvpError } =
        await supabase
          .from("RSVP")
          .select("eventID")
          .eq("userID", userID);

      if (rsvpError) throw rsvpError;

      const rsvpIDs = (rsvps ?? []).map((rsvp) => rsvp.eventID);

      let rsvpEvents: any[] = [];

      if (rsvpIDs.length > 0) {
        const { data, error } = await supabase
          .from("Event")
          .select("eventID, eventTitle, eventStartTime, eventEndTime")
          .in("eventID", rsvpIDs);

        if (error) throw error;

        rsvpEvents = data ?? [];
      }

      // Merge events without duplicates
      const eventMap = new Map<string, CalendarEvent>();

      for (const event of createdEvents ?? []) {
        eventMap.set(event.eventID, {
          ...event,
          isHost: true,
          isRSVP: rsvpIDs.includes(event.eventID),
        });
      }

      for (const event of rsvpEvents) {
        const existing = eventMap.get(event.eventID);

        if (existing) {
          existing.isRSVP = true;
        } else {
          eventMap.set(event.eventID, {
            ...event,
            isHost: false,
            isRSVP: true,
          });
        }
      }

      setEvents(Array.from(eventMap.values()));
    } catch (err) {
      console.error("Home calendar error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load upcoming events."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  // Check authentication and listen for login/logout changes.
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      await loadEvents();

      if (!mounted) return;
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setIsLoggedIn(!!session?.user);

      if (session) {
        void loadEvents();
      } else {
        setEvents([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadEvents]);

  // Only show upcoming events, sorted by start time.
  const upcomingEvents = useMemo(() => {
    const now = new Date();

    return events
      .filter((event) => {
        const start = new Date(event.eventStartTime);

        return (
          !Number.isNaN(start.getTime()) &&
          start >= now
        );
      })
      .filter((event) => {
        if (filter === "created") return event.isHost;
        if (filter === "rsvp") return event.isRSVP;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.eventStartTime).getTime() -
          new Date(b.eventStartTime).getTime()
      );
  }, [events, filter]);

  function formatDate(value: string) {
    const date = new Date(value);

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(value: string) {
    const date = new Date(value);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Logged-out homepage.
  if (!isLoggedIn) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.badge}>GO OUTSIDE</Text>

          <Text style={styles.title}>
            Find your next adventure.
          </Text>

          <Text style={styles.subtitle}>
            Discover outdoor events and communities around you.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Ready to explore?
          </Text>

          <Text style={styles.cardText}>
            Join GoOutside to discover events, meet people,
            and connect with your community.
          </Text>

          <View style={styles.buttons}>
            <AppButton
              title="Log In"
              onPress={() =>
                router.push("/login_sign_up/login")
              }
            />

            <AppButton
              title="Create Account"
              variant="secondary"
              onPress={() =>
                router.push("/login_sign_up/create_account")
              }
            />
          </View>
        </View>
      </Screen>
    );
  }

  // Logged-in homepage.
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadEvents(true)}
            tintColor="#315C3A"
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.badge}>GO OUTSIDE</Text>

          <Text style={styles.title}>
            Welcome back.
          </Text>

          <Text style={styles.subtitle}>
            Here's what's coming up.
          </Text>
        </View>

        {/* Upcoming Events */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Upcoming Events
              </Text>

              <Text style={styles.sectionSubtitle}>
                Your events and RSVPs
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/events")}
            >
              <Text style={styles.viewAll}>
                Explore Events →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.filters}>
            {(
              [
                ["all", "All"],
                ["created", "Created"],
                ["rsvp", "RSVP'd"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.filterButton,
                  filter === value && styles.activeFilter,
                ]}
                onPress={() => setFilter(value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === value && styles.activeFilterText,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Loading */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator
                size="large"
                color="#315C3A"
              />
              <Text style={styles.emptyText}>
                Loading your events...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Text style={styles.errorText}>{error}</Text>

              <TouchableOpacity
                onPress={() => loadEvents()}
              >
                <Text style={styles.viewAll}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : upcomingEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No upcoming events
              </Text>

              <Text style={styles.emptyText}>
                {filter === "created"
                  ? "You haven't created any upcoming events."
                  : filter === "rsvp"
                    ? "You haven't RSVP'd to any upcoming events."
                    : "You don't have any upcoming events yet. Explore events and find something to join!"}
              </Text>

              <AppButton
                title="Explore Events"
                onPress={() => router.push("/events")}
              />
            </View>
          ) : (
            <View style={styles.eventList}>
              {upcomingEvents.map((event) => (
                <TouchableOpacity
                  key={event.eventID}
                  style={styles.eventCard}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push(
                      `/events/${event.eventID}` as any
                    )
                  }
                >
                  <View style={styles.eventTop}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>
                        {event.eventTitle}
                      </Text>

                      <Text style={styles.eventDate}>
                        {formatDate(event.eventStartTime)}
                      </Text>

                      <Text style={styles.eventTime}>
                        {formatTime(event.eventStartTime)}
                      </Text>
                    </View>

                    <Text style={styles.eventArrow}>›</Text>
                  </View>

                  <View style={styles.eventBadges}>
                    {event.isHost && (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>
                          Created
                        </Text>
                      </View>
                    )}

                    {event.isRSVP && (
                      <View style={styles.rsvpBadge}>
                        <Text style={styles.rsvpBadgeText}>
                          RSVP'd
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 30,
  },

  hero: {
    marginTop: 35,
    marginBottom: 30,
  },

  badge: {
    color: "#557A5D",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },

  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1D2B20",
    lineHeight: 44,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 25,
    color: "#657068",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#1D2B20",
  },

  cardText: {
    marginTop: 8,
    color: "#69726B",
    fontSize: 15,
    lineHeight: 22,
  },

  buttons: {
    marginTop: 20,
    gap: 10,
  },

  eventsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D2B20",
  },

  sectionSubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: "#687269",
  },

  viewAll: {
    color: "#315C3A",
    fontSize: 13,
    fontWeight: "700",
  },

  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },

  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F2F4F0",
  },

  activeFilter: {
    backgroundColor: "#315C3A",
  },

  filterText: {
    color: "#526057",
    fontSize: 13,
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  center: {
    alignItems: "center",
    paddingVertical: 35,
  },

  emptyCard: {
    backgroundColor: "#F8FAF7",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1D2B20",
  },

  emptyText: {
    color: "#687269",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  errorText: {
    color: "#B42318",
    fontSize: 14,
    textAlign: "center",
  },

  eventList: {
    gap: 12,
  },

  eventCard: {
    backgroundColor: "#F8FAF7",
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E6EBE4",
  },

  eventTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  eventInfo: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1D2B20",
  },

  eventDate: {
    marginTop: 7,
    fontSize: 14,
    color: "#46574A",
    fontWeight: "600",
  },

  eventTime: {
    marginTop: 3,
    fontSize: 13,
    color: "#687269",
  },

  eventArrow: {
    fontSize: 28,
    color: "#557A5D",
    marginLeft: 10,
  },

  eventBadges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  hostBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  hostBadgeText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "700",
  },

  rsvpBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  rsvpBadgeText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "700",
  },
});
