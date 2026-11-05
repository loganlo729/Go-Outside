
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export type Location = {
  id: number;
  name: string;
  state_code: string;
};

type State = {
  code: string;
  name: string;
};

type Props = {
  stateCode: string;
  locationId: number | null;
  locationName: string;
  onStateChange: (code: string) => void;
  onSelect: (location: Location | null) => void;
};

export default function LocationPicker({
  stateCode,
  locationId,
  locationName,
  onStateChange,
  onSelect,
}: Props) {
  const [states, setStates] = useState<State[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [statesOpen, setStatesOpen] = useState(false);

  const [query, setQuery] = useState(locationName);
  const [results, setResults] = useState<Location[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Load states once from the lookup table.
  useEffect(() => {
    let active = true;

   async function loadStates() {
    const { data, error } = await supabase
      .from("State")
      .select("stateCode, stateName")
      .order("stateName");

    if (!active) return;

    if (error) {
      console.error("Failed to load states:", error);
      setSearchError("Unable to load states.");
      setStates([]);
    } else {
      setStates(
        (data ?? [])
          .filter((state) => state.stateCode && state.stateName)
          .map((state) => ({
            code: state.stateCode,
            name: state.stateName,
          }))
      );
    }

    setStatesLoading(false);
  }

    void loadStates();

    return () => {
      active = false;
    };
  }, []);

  // Restore the displayed city when saved data loads
  // or the parent resets the form.
  useEffect(() => {
    setQuery(locationName);
    setResults([]);
  }, [locationName]);

  // Search only when the user is typing an unselected city.
  useEffect(() => {
    if (
      !stateCode ||
      locationId !== null ||
      query.trim().length < 2
    ) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");

      const { data, error } = await supabase
        .from("Location")
        .select("id, name:locationName, state_code:stateCode")
        .eq("stateCode", stateCode)
        .in("localityType", ["city", "town"])
        .ilike("locationName", `${query.trim()}%`)
        .order("locationName")
        .limit(15);

      if (cancelled) return;

      if (error) {
        console.error("Location search failed:", error);
        setSearchError("Unable to search locations.");
        setResults([]);
      } else {
        setResults(data ?? []);
      }

      setSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, stateCode, locationId]);

  const selectedState = states.find(
    (state) => state.code === stateCode
  );

  console.log("LOCATION PICKER:", {
    receivedStateCode: stateCode,
    loadedStates: states.length,
    selectedState,
  });

  function handleStateChange(code: string) {
    setStatesOpen(false);
    setQuery("");
    setResults([]);
    setSearchError("");
    onStateChange(code);
    onSelect(null);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setResults([]);
    setSearchError("");

    // Clear the saved ID if the user edits the city.
    if (locationId !== null) {
      onSelect(null);
    }
  }

  function handleLocationSelect(location: Location) {
    setQuery(location.name);
    setResults([]);
    setSearchError("");
    onSelect(location);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>State</Text>
      <Pressable
        style={styles.input}
        onPress={() => setStatesOpen((previous) => !previous)}
        disabled={statesLoading}
        accessibilityRole="button"
      >
        <Text
          style={
            stateCode ? styles.inputText : styles.placeholder
          }
        >
          {statesLoading
            ? "Loading states..."
            : selectedState
              ? `${selectedState.name} (${selectedState.code})`
              : "Select a state"}
        </Text>
        <Text style={styles.arrow}>
          {statesOpen ? "▲" : "▼"}
        </Text>
      </Pressable>

      {statesOpen && (
        <View style={styles.dropdown}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.stateList}
          >
            {states.map((state) => (
              <Pressable
                key={state.code}
                style={[
                  styles.option,
                  stateCode === state.code &&
                    styles.selectedOption,
                ]}
                onPress={() => handleStateChange(state.code)}
              >
                <Text style={styles.optionText}>
                  {state.name} ({state.code})
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.label}>City or Town</Text>

      <TextInput
        style={[
          styles.input,
          !stateCode && styles.disabledInput,
        ]}
        value={query}
        onChangeText={handleQueryChange}
        placeholder={
          stateCode
            ? "Search cities and towns..."
            : "Select a state first"
        }
        placeholderTextColor="#94A3B8"
        editable={!!stateCode}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {searching && (
        <ActivityIndicator
          size="small"
          color="#0D9488"
          style={styles.loading}
        />
      )}

      {!!searchError && (
        <Text style={styles.error}>{searchError}</Text>
      )}

      {results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((location) => (
            <Pressable
              key={location.id}
              style={styles.option}
              onPress={() => handleLocationSelect(location)}
            >
              <Text style={styles.optionText}>
                {location.name}, {location.state_code}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {Boolean(stateCode) &&
        query.trim().length >= 2 &&
        !searching &&
        !searchError &&
        locationId === null &&
        results.length === 0 && (
          <Text style={styles.hint}>
            No matching cities or towns found.
          </Text>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#465873",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 8,
    backgroundColor: "#FCFDFF",
    paddingHorizontal: 12,
    minHeight: 43,
    fontSize: 14,
    color: "#172033",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputText: {
    color: "#172033",
    fontSize: 14,
  },
  placeholder: {
    color: "#94A3B8",
    fontSize: 14,
  },
  arrow: {
    color: "#64748B",
    fontSize: 11,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  stateList: {
    maxHeight: 190,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  selectedOption: {
    backgroundColor: "#CCFBF1",
  },
  optionText: {
    fontSize: 14,
    color: "#172033",
  },
  disabledInput: {
    backgroundColor: "#F1F5F9",
  },
  loading: {
    marginVertical: 8,
  },
  error: {
    color: "#B42318",
    fontSize: 12,
  },
  selectedText: {
    color: "#0D9488",
    fontSize: 12,
    fontWeight: "600",
  },
  hint: {
    color: "#64748B",
    fontSize: 12,
  },
});
