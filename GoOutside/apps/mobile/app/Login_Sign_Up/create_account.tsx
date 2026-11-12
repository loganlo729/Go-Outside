
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import AppButton from "../../src/components/ui/AppButton";
import Screen from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleGoogleSignUp() {
    if (loading || googleLoading) return;

    setGoogleLoading(true);
    setMessage("");

    try {
      const redirectTo = Linking.createURL("auth/callback");

      const { data, error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

      if (error) throw error;

      if (!data.url) {
        throw new Error(
          "Google authentication URL was not returned."
        );
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (result.type !== "success") return;

      const callbackUrl = new URL(result.url);

      const queryParams = callbackUrl.searchParams;
      const fragmentParams = new URLSearchParams(
        callbackUrl.hash.substring(1)
      );

      const oauthError =
        fragmentParams.get("error_description") ??
        fragmentParams.get("error") ??
        queryParams.get("error_description") ??
        queryParams.get("error");

      if (oauthError) throw new Error(oauthError);

      const accessToken =
        fragmentParams.get("access_token");
      const refreshToken =
        fragmentParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        throw new Error(
          "Google authentication did not return valid session tokens."
        );
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (sessionError) throw sessionError;

      if (!sessionData.user) {
        throw new Error(
          "Unable to retrieve your Google account."
        );
      }

      // Check whether the Google user already
      // completed their profile.
      const { data: profile, error: profileError } =
        await supabase
          .from("Profile")
          .select("profileCompleted")
          .eq("userID", sessionData.user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.profileCompleted === true) {
        router.replace("/profile");
      } else {
        router.replace("/login_sign_up/complete-profile");
      }
    } catch (err) {
      console.error(
        "Google sign-up failed:",
        err instanceof Error ? err.message : "Unknown error"
      );

      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to sign up with Google."
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignUp() {
    if (loading || googleLoading) return;

    const cleanUsername = username.trim().toLowerCase();

    setMessage("");

    if (!email.trim() || !cleanUsername || !password) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setMessage(
        "Username must be 3-20 characters and contain only letters, numbers, or underscores."
      );
      return;
    }

    setLoading(true);

    try {
      const { data: isTaken, error: usernameError } =
        await supabase.rpc("is_username_taken", {
          requested_username: cleanUsername,
        });

      if (usernameError) {
        setMessage("Unable to verify username availability.");
        return;
      }

      if (isTaken) {
        setMessage("This username is already taken.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: cleanUsername,
          },
        },
      });

      if (error) {
        if (
          error.code === "user_already_exists" ||
          error.message.toLowerCase().includes("already registered")
        ) {
          setMessage(
            "An account with this email already exists. Please log in."
          );
        } else {
          setMessage(error.message);
        }
        return;
      }

      if (!data.user) {
        setMessage("Account could not be created.");
        return;
      }

      if (!data.session) {
        setMessage(
          "Account created. Please check your email to confirm your account."
        );
        return;
      }

      router.replace("/profile");
    } catch {
      setMessage(
        "Unable to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Join GoOutside and start exploring.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email*</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
          editable={!loading && !googleLoading}
        />

        <Text style={styles.label}>Username*</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
          autoCapitalize="none"
          autoComplete="username"
          style={styles.input}
          editable={!loading && !googleLoading}
        />

        <Text style={styles.label}>Password*</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          autoComplete="new-password"
          style={styles.input}
          editable={!loading && !googleLoading}
        />

        {message !== "" && (
          <Text
            style={styles.message}
            accessibilityRole="alert"
          >
            {message}
          </Text>
        )}

        <View style={styles.button}>
          <AppButton
            title={
              loading
                ? "Creating Account..."
                : "Create Account"
            }
            onPress={handleSignUp}
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            (loading || googleLoading) &&
              styles.disabledButton,
          ]}
          onPress={handleGoogleSignUp}
          disabled={loading || googleLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.googleButtonText}>
            {googleLoading
              ? "Connecting to Google..."
              : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() =>
            router.push("/login_sign_up/login")
          }
          disabled={loading || googleLoading}
        >
          <Text style={styles.loginText}>
            Already have an account? Log in
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1D2B20",
  },
  subtitle: {
    marginTop: 8,
    color: "#687269",
    fontSize: 17,
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
  },
  message: {
    color: "#B42318",
    fontSize: 14,
    marginBottom: 15,
  },
  button: {
    marginTop: 5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDE3DC",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#687269",
    fontSize: 14,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: "#DDE3DC",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  googleButtonText: {
    color: "#1D2B20",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  loginButton: {
    marginTop: 22,
    alignItems: "center",
  },
  loginText: {
    color: "#344239",
    fontSize: 14,
    fontWeight: "600",
  },
});
