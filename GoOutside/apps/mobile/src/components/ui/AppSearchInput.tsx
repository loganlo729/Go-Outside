
import React from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { theme } from "../../constants/theme";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export default function AppSearchInput({
  value,
  onChangeText,
  placeholder = "Search...",
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⌕</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8390A1"
        autoCapitalize="none"
        returnKeyType="search"
      />

      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Text style={styles.clear}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 20,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.medium,
  },
  icon: {
    fontSize: 25,
    color: "#53617A",
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  clear: {
    fontSize: 24,
    color: theme.colors.secondaryText,
    paddingHorizontal: 5,
  },
});

