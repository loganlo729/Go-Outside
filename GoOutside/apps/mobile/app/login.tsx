import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../src/components/AppButton";
import Screen from "../src/components/Screen";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    Alert.alert(
      "Login",
      `Login attempt for ${email}`
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