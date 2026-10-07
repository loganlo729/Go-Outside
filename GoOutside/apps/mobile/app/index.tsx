import { router } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../src/components/AppButton";
import Screen from "../src/components/Screen";

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.badge}>GO OUTSIDE</Text>

        <Text style={styles.title}>
          Find your next adventure.
        </Text>

        <Text style={styles.subtitle}>
          Discover outdoor events and communities around you.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Ready to explore?
        </Text>

        <Text style={styles.cardText}>
          Browse events, meet people, and find something worth
          leaving the house for.
        </Text>

        <View style={styles.buttons}>
          <AppButton
            title="View Profile"
            onPress={() => router.push("/profile")}
          />

          <AppButton
            title="Login"
            variant="secondary"
            onPress={() => router.push("/login")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: "center",
  },

  badge: {
    color: "#557A5D",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },

  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#1D2B20",
    lineHeight: 48,
  },

  subtitle: {
    marginTop: 16,
    fontSize: 18,
    lineHeight: 27,
    color: "#657068",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#1D2B20",
  },

  cardText: {
    marginTop: 8,
    color: "#69726B",
    fontSize: 15,
    lineHeight: 22,
  },

  buttons: {
    marginTop: 20,
    gap: 10,
  },
});