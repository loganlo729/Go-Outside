// React hooks
import React, { useEffect, useState } from "react";

// UI components
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// App theme
import { theme } from "../../constants/theme";


// --------------------------------------------------
// Types and Configuration
// --------------------------------------------------

type Suggestion = {
  formatted: string;
};

// Geoapify configuration
const API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

const ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";

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
      !API_KEY ||
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
        const url = `${ENDPOINT}?text=${encodeURIComponent(value.trim())}`;

        console.log("Address API request:", url);

        const params = new URLSearchParams({
          text: value.trim(),
          format: "json",
          limit: "5",
          lang: "en",
          apiKey: API_KEY!,
        });

        const response = await fetch(
          `${ENDPOINT}?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        console.log("Address API status:", response.status);

        if (!response.ok) {
          const responseText = await response.text();

          console.error(
            "Address API error:",
            response.status,
            responseText
          );

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
          console.error("Address autocomplete failed:", error);

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
  }, [value, picked, disabled, ENDPOINT]);

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

      {!API_KEY && (
        <Text style={styles.message}>
          Address autocomplete is not configured.
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
