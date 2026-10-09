import { StyleSheet, Text, View } from "react-native";
import Screen from "../../src/components/Screen";

export default function CommunitiesScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Communities</Text>
        <Text>Find people who share your interests.</Text>
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