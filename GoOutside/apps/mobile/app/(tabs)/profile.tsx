
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../src/components/AppButton";
import Screen from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const { error: logoutError } = await supabase.auth.signOut();

      if (logoutError) {
        setError(logoutError.message);
        return;
      }

      router.replace("/");
    } catch {
      setError("Unable to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>

        <Text style={styles.name}>User Profile</Text>

        <Text style={styles.username}>
          @username
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
          title={loading ? "Logging Out..." : "Log Out"}
          onPress={handleLogout}
        />
      </View>

      {error !== "" && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
