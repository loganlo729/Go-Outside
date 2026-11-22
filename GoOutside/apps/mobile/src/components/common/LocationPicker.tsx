// ==================================================
// Imports
// ==================================================

// React
import {
  useEffect,
  useRef,
  useState,
} from "react";

// React Native
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Supabase
import { supabase } from "../../lib/supabase";

// ==================================================
// Types
// ==================================================

// --------------------------------------------------
// Location
// --------------------------------------------------

export type Location = {
  id: number;
  name: string;
  state_code: string;
};

// --------------------------------------------------
// State
// --------------------------------------------------

type State = {
  code: string;
  name: string;
};

// --------------------------------------------------
// Props
// --------------------------------------------------

type Props = {
  stateCode: string;
  locationId: number | null;
  locationName: string;

  onStateChange: (code: string) => void;
  onSelect: (location: Location | null) => void;
};

// ==================================================
// Location Picker
// ==================================================

export default function LocationPicker({
  stateCode,
  locationId,
  locationName,
  onStateChange,
  onSelect,
}: Props) {

  // ==================================================
  // State Selection
  // ==================================================

  const [states, setStates] = useState<State[]>([]);

  const [statesLoading, setStatesLoading] =
    useState(true);

  const [statesError, setStatesError] =
    useState("");

  const [statesOpen, setStatesOpen] =
    useState(false);

  // ==================================================
  // City Search
  // ==================================================

  const [query, setQuery] =
    useState(locationName);

  const [results, setResults] =
    useState<Location[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [searchError, setSearchError] =
    useState("");

  // --------------------------------------------------
  // Prevent Unwanted Query Resets
  // --------------------------------------------------

  const skipNextExternalSync = useRef(false);

  // --------------------------------------------------
  // Track Search Requests
  // --------------------------------------------------

  const searchRequestID = useRef(0);

  // ==================================================
  // Load States
  // ==================================================

  useEffect(() => {
    let active = true;

    async function loadStates() {
      setStatesLoading(true);
      setStatesError("");

      const { data, error } = await supabase
        .from("State")
        .select("stateCode, stateName")
        .order("stateName");

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          "Failed to load states:",
          error
        );

        setStatesError(
          "Unable to load states."
        );

        setStates([]);
      } else {
        const stateOptions = (data ?? [])
          .filter(
            (state) =>
              Boolean(state.stateCode) &&
              Boolean(state.stateName)
          )
          .map((state) => ({
            code: state.stateCode,
            name: state.stateName,
          }));

        setStates(stateOptions);
      }

      setStatesLoading(false);
    }

    void loadStates();

    return () => {
      active = false;
    };
  }, []);

  // ==================================================
  // Synchronize External Location
  // ==================================================

  useEffect(() => {
    if (skipNextExternalSync.current) {
      skipNextExternalSync.current = false;
      return;
    }

    setQuery(locationName);
    setResults([]);
  }, [locationName]);

  // ==================================================
  // Search Cities and Towns
  // ==================================================

  useEffect(() => {
    // Increment request ID to invalidate older searches.
    const currentRequest = ++searchRequestID.current;

    // --------------------------------------------------
    // Check Search Requirements
    // --------------------------------------------------

    if (
      !stateCode ||
      locationId !== null ||
      query.trim().length < 2
    ) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;

    // --------------------------------------------------
    // Debounced Search
    // --------------------------------------------------

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");

      const { data, error } = await supabase
        .from("Location")
        .select(
          "id, name:locationName, state_code:stateCode"
        )
        .eq("stateCode", stateCode)
        .in("localityType", ["city", "town"])
        .ilike(
          "locationName",
          `${query.trim()}%`
        )
        .order("locationName")
        .limit(15);

      // Ignore outdated search responses.
      if (
        !active ||
        searchRequestID.current !== currentRequest
      ) {
        return;
      }

      // --------------------------------------------------
      // Handle Search Errors
      // --------------------------------------------------

      if (error) {
        console.error(
          "Location search failed:",
          error
        );

        setSearchError(
          "Unable to search locations."
        );

        setResults([]);
      } else {
        setResults(
          (data ?? []) as unknown as Location[]
        );
      }

      setSearching(false);
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    query,
    stateCode,
    locationId,
  ]);

  // ==================================================
  // Selected State
  // ==================================================

  const selectedState = states.find(
    (state) => state.code === stateCode
  );

  // ==================================================
  // Handlers
  // ==================================================

  // --------------------------------------------------
  // Change State
  // --------------------------------------------------

  function handleStateChange(code: string) {
    // Invalidate any outstanding city search.
    searchRequestID.current++;

    setStatesOpen(false);

    setQuery("");
    setResults([]);

    setSearchError("");
    setSearching(false);

    // Clear the selected city in the parent.
    onStateChange(code);
    onSelect(null);
  }

  // --------------------------------------------------
  // Edit City Search
  // --------------------------------------------------

  function handleQueryChange(value: string) {
    setQuery(value);
    setResults([]);
    setSearchError("");

    // If a city was previously selected,
    // clear its saved ID without erasing
    // the newly typed search text.
    if (locationId !== null) {
      skipNextExternalSync.current = true;
      onSelect(null);
    }
  }

  // --------------------------------------------------
  // Select City
  // --------------------------------------------------

  function handleLocationSelect(
    location: Location
  ) {
    searchRequestID.current++;

    setQuery(location.name);
    setResults([]);

    setSearching(false);
    setSearchError("");

    onSelect(location);
  }

  // ==================================================
  // Render
  // ==================================================

  return (
    <View style={styles.container}>

      {/* ========================================
          State Selection
      ======================================== */}

      <Text style={styles.label}>
        State
      </Text>

      <Pressable
        style={styles.input}
        onPress={() =>
          setStatesOpen((previous) => !previous)
        }
        disabled={statesLoading}
        accessibilityRole="button"
        accessibilityLabel="Select a state"
        accessibilityState={{
          expanded: statesOpen,
          disabled: statesLoading,
        }}
      >
        <Text
          style={
            stateCode
              ? styles.inputText
              : styles.placeholder
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

      {/* ----------------------------------------
          State Loading Error
      ---------------------------------------- */}

      {Boolean(statesError) && (
        <Text style={styles.error}>
          {statesError}
        </Text>
      )}

      {/* ----------------------------------------
          State Dropdown
      ---------------------------------------- */}

      {statesOpen && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.stateList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {states.map((state) => (
              <Pressable
                key={state.code}
                style={[
                  styles.option,
                  stateCode === state.code &&
                    styles.selectedOption,
                ]}
                onPress={() =>
                  handleStateChange(state.code)
                }
              >
                <Text style={styles.optionText}>
                  {state.name} ({state.code})
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ========================================
          City or Town Selection
      ======================================== */}

      <Text style={styles.label}>
        City or Town (Optional)
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.cityInput,
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
        editable={Boolean(stateCode)}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {/* ----------------------------------------
          Search Loading
      ---------------------------------------- */}

      {searching && (
        <ActivityIndicator
          size="small"
          color="#0D9488"
          style={styles.loading}
        />
      )}

      {/* ----------------------------------------
          Search Error
      ---------------------------------------- */}

      {Boolean(searchError) && (
        <Text style={styles.error}>
          {searchError}
        </Text>
      )}

      {/* ----------------------------------------
          City Search Results
      ---------------------------------------- */}

      {results.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.locationList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="always"
          >
            {results.map((location) => (
              <Pressable
                key={location.id}
                style={styles.option}
                onPress={() =>
                  handleLocationSelect(location)
                }
              >
                <Text style={styles.optionText}>
                  {location.name},{" "}
                  {location.state_code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ----------------------------------------
          No Matching Locations
      ---------------------------------------- */}

      {Boolean(stateCode) &&
        query.trim().length >= 2 &&
        !searching &&
        !searchError &&
        locationId === null &&
        results.length === 0 && (
          <Text style={styles.hint}>
            No matching cities or towns found
            within {stateCode}.
          </Text>
        )}

    </View>
  );
}

// ==================================================
// Styles
// ==================================================

const styles = StyleSheet.create({

  // --------------------------------------------------
  // Container
  // --------------------------------------------------

  container: {
    marginTop: 14,
    gap: 8,
  },

  // --------------------------------------------------
  // Labels
  // --------------------------------------------------

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#465873",
    marginTop: 4,
  },

  // --------------------------------------------------
  // Inputs
  // --------------------------------------------------

  input: {
    minHeight: 43,
    paddingHorizontal: 12,

    backgroundColor: "#FCFDFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 8,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    fontSize: 14,
    color: "#172033",
  },

  cityInput: {
    paddingVertical: 10,
  },

  inputText: {
    color: "#172033",
    fontSize: 14,
  },

  placeholder: {
    color: "#94A3B8",
    fontSize: 14,
  },

  disabledInput: {
    backgroundColor: "#F1F5F9",
  },

  arrow: {
    color: "#64748B",
    fontSize: 11,
  },

  // --------------------------------------------------
  // Dropdown
  // --------------------------------------------------

  dropdown: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 8,
    overflow: "hidden",
  },

  stateList: {
    maxHeight: 190,
  },

  locationList: {
    maxHeight: 190,
  },

  // --------------------------------------------------
  // Dropdown Options
  // --------------------------------------------------

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
    color: "#172033",
    fontSize: 14,
  },

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  loading: {
    marginVertical: 8,
  },

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  error: {
    color: "#B42318",
    fontSize: 12,
  },

  // --------------------------------------------------
  // Search Hint
  // --------------------------------------------------

  hint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },
});