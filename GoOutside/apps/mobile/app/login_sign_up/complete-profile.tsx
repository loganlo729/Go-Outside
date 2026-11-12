
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Screen from "../../src/components/Screen";
import AppButton from "../../src/components/ui/AppButton";
import { supabase } from "../../src/lib/supabase";

export default function CompleteProfileScreen() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkProfile() {
      try {
        const { data, error: authError } =
          await supabase.auth.getUser();

        if (authError || !data.user) {
          router.replace("/login_sign_up/login");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("Profile")
            .select("profileCompleted")
            .eq("userID", data.user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!mounted) return;

        if (profile?.profileCompleted === true) {
          router.replace("/profile");
          return;
        }

        setUserId(data.user.id);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }

    void checkProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit() {
    if (!userId || saving) return;

    const cleanUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError(
        "Username must be 3–20 characters using letters, numbers, or underscores."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Verify the current user is still authenticated.
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      if (authData.user.id !== userId) {
        throw new Error(
          "Your session has changed. Please reopen this page."
        );
      }

      // Check whether the username is already taken.
      const { data: taken, error: checkError } =
        await supabase.rpc("is_username_taken", {
          requested_username: cleanUsername,
        });

      if (checkError) throw checkError;

      if (taken) {
        setError("This username is already taken.");
        return;
      }

      // Confirm the profile exists.
      const { data: existingProfile, error: lookupError } =
        await supabase
          .from("Profile")
          .select("userID, profileCompleted")
          .eq("userID", userId)
          .maybeSingle();

      if (lookupError) throw lookupError;

      if (!existingProfile) {
        throw new Error(
          "Your profile record hasn't been created yet. Please contact support."
        );
      }

      if (existingProfile.profileCompleted === true) {
        router.replace("/profile");
        return;
      }

      // Save username and mark registration complete.
      const { data: updatedProfile, error: updateError } =
        await supabase
          .from("Profile")
          .update({
            username: cleanUsername,
            profileCompleted: true,
          })
          .eq("userID", userId)
          .eq("profileCompleted", false)
          .select("username, profileCompleted")
          .single();

      if (updateError) throw updateError;

      if (
        !updatedProfile ||
        updatedProfile.username !== cleanUsername ||
        updatedProfile.profileCompleted !== true
      ) {
        throw new Error(
          "Username could not be saved. Please try again."
        );
      }

      // Send welcome email.
      // A failure here should not block registration.
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

          if (apiBaseUrl) {
            const response = await fetch(
              `${apiBaseUrl.replace(/\/$/, "")}/api/send-welcome`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );

            if (!response.ok) {
              console.error(
                "Welcome email request failed:",
                response.status
              );
            }
          } else {
            console.warn(
              "EXPO_PUBLIC_API_URL is not configured. Skipping welcome email."
            );
          }
        }
      } catch (emailError) {
        console.error("Welcome email error:", emailError);
      }

      router.replace("/(tabs)/profile");
    } catch (err) {
      console.error("Complete profile error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1D2B20" />
          <Text style={styles.loadingText}>
            Checking your account...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ALMOST THERE</Text>

        <Text style={styles.title}>
          Complete Your Profile
        </Text>

        <Text style={styles.subtitle}>
          Choose a username to finish setting up your
          GoOutside account.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Username*</Text>

        <TextInput
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setError("");
          }}
          placeholder="Choose a username"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={20}
          style={styles.input}
          editable={!saving && !!userId}
        />

        {error !== "" && (
          <Text
            style={styles.message}
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}

        <View style={styles.button}>
          <AppButton
            title={
              saving
                ? "Saving..."
                : "Complete Registration"
            }
            onPress={handleSubmit}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    color: "#687269",
    fontSize: 16,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  eyebrow: {
    color: "#687269",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1D2B20",
  },
  subtitle: {
    marginTop: 12,
    color: "#687269",
    fontSize: 17,
    lineHeight: 25,
  },
  form: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 20,
  },
  label: {
    fontWeight: "600",
    color: "#344239",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F2F4F0",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    color: "#1D2B20",
  },
  message: {
    color: "#B42318",
    fontSize: 14,
    marginBottom: 15,
  },
  button: {
    marginTop: 5,
  },
});