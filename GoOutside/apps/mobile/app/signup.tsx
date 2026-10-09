import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../src/components/AppButton";
import Screen from "../src/components/Screen";
import { supabase } from "../src/lib/supabase";

export default function SignUpScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    const cleanUsername = username.trim().toLowerCase();

    if (!email.trim() || !cleanUsername || !password) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
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
        Alert.alert("Registration Failed", error.message);
        return;
      }

      if (!data.user) {
        Alert.alert("Error", "Account could not be created.");
        return;
      }

      if (!data.session) {
        Alert.alert(
          "Check Your Email",
          "Please confirm your email before logging in."
        );
        router.replace("/login");
        return;
      }

      router.replace("/profile");
    } catch {
      Alert.alert("Error", "Unable to create account.");
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
        />

        <Text style={styles.label}>Username*</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
          autoCapitalize="none"
          autoComplete="username"
          style={styles.input}
        />

        <Text style={styles.label}>Password*</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          autoComplete="new-password"
          style={styles.input}
        />

        <View style={styles.button}>
          <AppButton
            title={loading ? "Creating Account..." : "Create Account"}
            onPress={handleSignUp}
          />
        </View>
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
  button: {
    marginTop: 5,
  },
});
