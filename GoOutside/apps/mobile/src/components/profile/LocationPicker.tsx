import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Location = {
  id: number;
  name: string;
  state_code: string;
};

type Props = {
  stateCode: string;
  onStateChange: (state: string) => void;
  onSelect: (location: Location) => void;
};

export default function LocationPicker({
  stateCode,
  onStateChange,
  onSelect,
}: Props) {
  const [states, setStates] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStates() {
      const { data, error } = await supabase
        .from("locations")
        .select("state_code")
        .in("locality_type", ["city", "town"]);

      if (error) {
        console.error(error);
        return;
      }

      setStates([
        ...new Set((data ?? []).map((row) => row.state_code)),
      ].sort());
    }

    void loadStates();
  }, []);

  useEffect(() => {
    if (!stateCode || query.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("locations")
        .select("id, name, state_code")
        .eq("state_code", stateCode)
        .in("locality_type", ["city", "town"])
        .ilike("name", `${query.trim()}%`)
        .order("name")
        .limit(15);

      if (!cancelled) {
        if (error) {
          console.error(error);
          setResults([]);
        } else {
          setResults(data ?? []);
        }
        setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, stateCode]);

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontWeight: "700" }}>State</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {states.map((state) => (
          <Pressable
            key={state}
            onPress={() => {
              onStateChange(state);
              setQuery("");
              setResults([]);
            }}
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor:
                stateCode === state ? "#0D9488" : "#E2E8F0",
            }}
          >
            <Text
              style={{
                color: stateCode === state ? "white" : "#172033",
              }}
            >
              {state}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontWeight: "700" }}>City or Town</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search cities and towns..."
        editable={!!stateCode}
        style={{
          borderWidth: 1,
          borderColor: "#DCE5EF",
          padding: 12,
          borderRadius: 8,
        }}
      />

      {loading && <ActivityIndicator />}

      {results.map((location) => (
        <Pressable
          key={location.id}
          onPress={() => {
            onSelect(location);
            setQuery(location.name);
            setResults([]);
          }}
          style={{ padding: 10 }}
        >
          <Text>
            {location.name}, {location.state_code}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}