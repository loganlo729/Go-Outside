import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function SettingsCard({
  title,
  description,
  children,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
  },
  description: {
    marginTop: 5,
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
});