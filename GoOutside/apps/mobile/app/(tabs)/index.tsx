
import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../src/components/AppButton";
import Screen from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check the current Supabase session
    supabase.auth.getUser().then(({ data, error }) => {
      setIsLoggedIn(!error && !!data.user);
      setLoading(false);
    });

    // Update when the user logs in or out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          {isLoggedIn ? "Welcome back!" : "Ready to explore?"}
        </Text>

        <Text style={styles.cardText}>
          {isLoggedIn
            ? "Explore upcoming events, connect with communities, and discover something new."
            : "Join GoOutside to discover events, meet people, and connect with your community."}
        </Text>

        <View style={styles.buttons}>
          {loading ? (
            <ActivityIndicator color="#315C3A" />
          ) : isLoggedIn ? (
            <>
              <AppButton
                title="Explore Events"
                onPress={() => router.push("/events")}
              />

              <AppButton
                title="View Profile"
                variant="secondary"
                onPress={() => router.push("/profile")}
              />
            </>
          ) : (
            <>
              <AppButton
                title="Log In"
                onPress={() => router.push("/login")}
              />

              <AppButton
                title="Create Account"
                variant="secondary"
                onPress={() => router.push("/signup")}
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: "center",
  },

  badge: {
    color: "#557A5D",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },

  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#1D2B20",
    lineHeight: 48,
  },

  subtitle: {
    marginTop: 16,
    fontSize: 18,
    lineHeight: 27,
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
});
