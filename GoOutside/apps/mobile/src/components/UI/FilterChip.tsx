import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../../constants/theme";

type Props = { label: string; selected: boolean; onPress: () => void };

export default function FilterChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: "#DEE4EB", borderRadius: theme.radius.pill, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: theme.colors.background },
  selected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  text: { fontSize: 12, color: "#42516B" },
  selectedText: { color: theme.colors.primary, fontWeight: "700" },
});
