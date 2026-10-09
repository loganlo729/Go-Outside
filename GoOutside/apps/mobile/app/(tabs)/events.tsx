import { StyleSheet, Text, View } from "react-native";
import Screen from "../../src/components/Screen";

export default function EventsScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Events</Text>
        <Text>Discover upcoming events near you.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1D2B20",
    marginBottom: 10,
  },
});