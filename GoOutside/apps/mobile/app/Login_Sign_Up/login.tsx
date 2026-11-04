import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import AppButton from "../../src/components/ui/AppButton";
import Screen from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert("Login Failed", error.message);
      return;
    }

    router.replace("/profile");
  }

  function handleForgotPassword() {
    Alert.alert(
      "Forgot Password",
      `Password reset link sent to ${email}`
    );
  }

  function handleCreateAccount() {
    Alert.alert(
      "Create Account",
      `Account created for ${email}`
    );
  }

  return (
    <Screen>
      {/* <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#1D2B20" />
      </TouchableOpacity> */}

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
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        <View style={styles.button}>
          <AppButton
            title="Sign In"
            onPress={handleLogin}
          />

          <AppButton
            title="Forgot Password?"
            variant="secondary"
            onPress={handleForgotPassword}
          />

          <AppButton
            title="Create Account"
            variant="tertiary"
            onPress={() => router.push("../login_sign_up/create_account")}
          />
          
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ⬇️ New style for the back arrow placement
  /* backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingRight: 20,
    marginTop: 10,
  }, */

  header: {
    marginTop: 20, // Adjusted down slightly to compensate for arrow
    marginBottom: 40,
  },

  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1D2B20",
  },

  subtitle: {
    marginTop: 8,
    color: "#1D2B20", //687269
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
});
