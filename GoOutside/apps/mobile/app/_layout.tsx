
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      authEventReceived = true;

      if (mounted) {
        setSession(newSession);
        setLoading(false);
      }
    });

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Session error:", error);
      }

      if (!authEventReceived) {
        setSession(data.session);
        setLoading(false);
      }
    }

    void checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const group = segments[0];
    const screen = segments[1];

    // Allow authentication callbacks and profile completion.
    if (
      group === "auth" ||
      (group === "login_sign_up" &&
        screen === "complete-profile")
    ) {
      return;
    }

    // Redirect logged-in users away from login and welcome.
    if (
      session &&
      (group === "welcome" || group === "login_sign_up")
    ) {
      router.replace("/(tabs)");
      return;
    }

    // Redirect logged-out users to the public homepage.
    if (
      !session &&
      group === "(tabs)" &&
      (segments.length === 1 || screen === "index")
    ) {
      router.replace("/welcome");
    }
  }, [session, loading, segments, router]);

  useEffect(() => {
    if (!loading) {
      void SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) return null;

  return (
    <Stack>
      <Stack.Screen
        name="welcome"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="login_sign_up"
        options={{
          presentation: "modal",
          headerTitle: '', // Hides the title text
          headerTransparent: true, // Removes the background color and bottom border
          headerBackTitle: '', // Hides "Back" text on iOS
          headerTintColor: '#000000', // Color of back arrow
        }}
      />

      <Stack.Screen
        name="auth"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
