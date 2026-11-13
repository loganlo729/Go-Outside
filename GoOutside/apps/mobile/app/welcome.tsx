
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import Screen from "../src/components/Screen";
import AppButton from "../src/components/ui/AppButton";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.container}>
        <View>
          <Text style={styles.title}>Go Outside.</Text>

          <Text style={styles.subtitle}>
            Find events, discover communities, and explore
            new places with others.
          </Text>
        </View>

        <View style={styles.buttons}>
          <AppButton
            title="Log In"
            onPress={() =>
              router.push("/login_sign_up/login")
            }
          />

          <AppButton
            title="Create Account"
            variant="secondary"
            onPress={() =>
              router.push("/login_sign_up/create_account")
            }
          />

          <AppButton
            title="Explore Events"
            variant="tertiary"
            onPress={() => router.push("/events")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#1D2B20",
  },

  subtitle: {
    fontSize: 17,
    color: "#687269",
    marginTop: 12,
    lineHeight: 25,
  },

  buttons: {
    marginTop: 40,
    gap: 12,
  },
});
