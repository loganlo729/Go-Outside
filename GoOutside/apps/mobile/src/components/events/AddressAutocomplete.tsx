
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { theme } from "../../constants/theme";

// --------------------------------------------------
// Types and Configuration
// --------------------------------------------------

type Suggestion = {
  formatted: string;
};

const ENDPOINT = process.env.GEOAPIFY_API_KEY;

// --------------------------------------------------
// Address Autocomplete
// --------------------------------------------------

export default function AddressAutocomplete({
  value,
  onChangeText,
  disabled = false,
}: {
  value: string;
  onChangeText: (text: string) => void;
  disabled?: boolean;
}) {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [picked, setPicked] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Fetch Address Suggestions
  // --------------------------------------------------

  useEffect(() => {
    setItems([]);
    setError("");

    if (
      disabled ||
      !ENDPOINT ||
      value.trim().length < 3 ||
      picked === value
    ) {
      setBusy(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setBusy(true);

      try {
        const response = await fetch(
          `${ENDPOINT}?text=${encodeURIComponent(value.trim())}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Address search unavailable");
        }

        const json: {
          results?: Suggestion[];
        } = await response.json();

        if (!controller.signal.aborted) {
          setItems(
            (json.results ?? []).filter(
              (item) =>
                typeof item.formatted === "string"
            )
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            "Suggestions unavailable. You can enter a location manually."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setBusy(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, picked, disabled]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <View style={styles.wrap}>
      {/* Address Input */}

      <TextInput
        style={styles.input}
        value={value}
        editable={!disabled}
        placeholder="Start typing an address..."
        placeholderTextColor="#89938B"
        autoCorrect={false}
        onChangeText={(text) => {
          setPicked("");
          onChangeText(text);
        }}
      />

      {/* Loading Indicator */}

      {busy && (
        <ActivityIndicator
          color={theme.colors.primary}
          style={styles.busy}
        />
      )}

      {/* Error Message */}

      {!!error && (
        <Text style={styles.message}>
          {error}
        </Text>
      )}

      {/* Missing API Configuration */}

      {!ENDPOINT && (
        <Text style={styles.message}>
          Autocomplete needs GEOAPIFY_API_KEY;
          manual entry still works.
        </Text>
      )}

      {/* Address Suggestions */}

      {items.length > 0 && (
        <View style={styles.menu}>
          {items.map((item, index) => (
            <Pressable
              key={`${item.formatted}-${index}`}
              style={styles.item}
              onPress={() => {
                setPicked(item.formatted);
                onChangeText(item.formatted);
                setItems([]);
              }}
            >
              <Text style={styles.itemText}>
                ⌖ {item.formatted}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 20,
  },

  input: {
    borderColor: "#CFD6CB",
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    color: "#1F2E22",
    backgroundColor: "#FFF",
    fontSize: 16,
  },

  busy: {
    position: "absolute",
    right: 14,
    top: 15,
  },

  menu: {
    borderColor: "#D8DDD4",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#FFF",
    marginTop: 4,
    elevation: 5,
  },

  item: {
    padding: 12,
    borderBottomColor: "#EDF0EA",
    borderBottomWidth: 1,
  },

  itemText: {
    color: "#1F2E22",
  },

  message: {
    fontSize: 12,
    color: "#63715F",
    marginTop: 5,
  },
});
