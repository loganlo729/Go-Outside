
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { User } from "@supabase/supabase-js";

import AppButton from "../../src/components/AppButton";
import Screen from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    // Check whether the user is authenticated
    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error) {
          setUser(null);
        } else {
          setUser(data.user);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    }

    void checkAuth();

    // React to login and logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setUser(session?.user ?? null);
        setCheckingAuth(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const { error: logoutError } =
        await supabase.auth.signOut();

      if (logoutError) {
        setError(logoutError.message);
        return;
      }

      setUser(null);
      router.replace("/");
    } catch {
      setError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  // Wait until authentication has been checked
  if (checkingAuth) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#315C3A" />
          <Text style={styles.body}>
            Checking authentication...
          </Text>
        </View>
      </Screen>
    );
  }

  // Guest view
  if (!user) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.name}>
            You're not logged in
          </Text>

          <Text style={styles.guestText}>
            Log in or create an account to view your profile,
            manage your events, and connect with communities.
          </Text>

          <View style={styles.guestButtons}>
            <AppButton
              title="Log In"
              onPress={() => router.push("/Login_Sign_Up/login")}
            />

            <AppButton
              title="Create Account"
              variant="secondary"
              onPress={() => router.push("/Login_Sign_Up/create_account")}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // Authenticated user view
  const username =
    user.user_metadata?.username || "username";

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {username.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>User Profile</Text>

        <Text style={styles.username}>
          @{username}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>About</Text>

        <Text style={styles.body}>
          Your profile information and outdoor activity will
          eventually appear here.
        </Text>
      </View>

      <View style={styles.button}>
        <AppButton
          title="Edit Profile"
          variant="secondary"
          onPress={() => {}}
        />
      </View>

      <View style={styles.button}>
        <AppButton
          title={loggingOut ? "Logging Out..." : "Log Out"}
          onPress={handleLogout}
        />
      </View>

      {error !== "" && (
        <Text style={styles.error}>{error}</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  guestText: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: "#69726B",
    textAlign: "center",
  },

  guestButtons: {
    marginTop: 28,
    width: "100%",
    gap: 12,
  },

  header: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#315C3A",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "700",
  },

  name: {
    marginTop: 16,
    fontSize: 26,
    fontWeight: "700",
    color: "#1D2B20",
  },

  username: {
    marginTop: 4,
    color: "#788078",
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 20,
  },

  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#26342A",
  },

  body: {
    marginTop: 8,
    color: "#69726B",
    lineHeight: 22,
  },

  button: {
    marginTop: 16,
  },

  error: {
    marginTop: 12,
    color: "#B42318",
    fontSize: 14,
    textAlign: "center",
  },
});
