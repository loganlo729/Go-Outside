
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import AppButton from "../../src/components/ui/AppButton";
import Screen from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function redirectAfterLogin(userId: string) {
    const { data: profile, error } = await supabase
      .from("Profile")
      .select("profileCompleted")
      .eq("userID", userId)
      .maybeSingle();

    if (error) throw error;

    if (!profile || profile.profileCompleted !== true) {
      router.replace("/login_sign_up/complete-profile");
    } else {
      router.replace("/profile");
    }
  }

  async function handleLogin() {
    if (loading || googleLoading) return;

    if (!email.trim() || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Unable to retrieve your account.");
      }

      await redirectAfterLogin(data.user.id);
    } catch (err) {
      Alert.alert(
        "Login Failed",
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (loading || googleLoading) return;

    setGoogleLoading(true);

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

      // Handle OAuth errors in either URL location.
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

      // Current Supabase OAuth configuration returns
      // session tokens in the URL fragment.
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

      await redirectAfterLogin(sessionData.user.id);
    } catch (err) {
      console.error(
        "Google login failed:",
        err instanceof Error ? err.message : "Unknown error"
      );

      Alert.alert(
        "Google Sign-In Failed",
        err instanceof Error
          ? err.message
          : "Unable to sign in with Google."
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleForgotPassword() {
    Alert.alert(
      "Forgot Password",
      `Password reset link sent to ${email}`
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back.</Text>
        <Text style={styles.subtitle}>
          Sign in to continue exploring.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>

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

        <Text style={styles.label}>Password</Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          editable={!loading && !googleLoading}
        />

        <View style={styles.button}>
          <AppButton
            title={loading ? "Signing In..." : "Sign In"}
            onPress={handleLogin}
          />

          <AppButton
            title="Forgot Password?"
            variant="secondary"
            onPress={handleForgotPassword}
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
          onPress={handleGoogleLogin}
          disabled={loading || googleLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.googleButtonText}>
            {googleLoading
              ? "Connecting to Google..."
              : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        <View style={styles.createAccountButton}>
          <AppButton
            title="Create Account"
            variant="tertiary"
            onPress={() =>
              router.push("/login_sign_up/create_account")
            }
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1D2B20",
  },
  subtitle: {
    marginTop: 8,
    color: "#1D2B20",
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
    color: "#687269",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    marginTop: 5,
    gap: 10,
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
  createAccountButton: {
    marginTop: 15,
  },
});
