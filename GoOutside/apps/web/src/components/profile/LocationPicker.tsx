"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

export type LocationOption = {
  id: number;
  name: string;
  state_code: string;
};

type StateOption = { code: string; name: string };

type Props = {
  stateCode: string;
  locationId: number | null;
  locationName: string;
  onStateChange: (code: string) => void;
  onSelect: (location: LocationOption | null) => void;
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #DCE5EF",
  borderRadius: 8,
  background: "#FCFDFF",
  padding: "11px 12px",
  fontSize: 14,
  color: "#172033",
};
const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#465873",
  marginBottom: 7,
};

export default function LocationPicker({
  stateCode,
  locationId,
  locationName,
  onStateChange,
  onSelect,
}: Props) {
  const [states, setStates] = useState<StateOption[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [statesError, setStatesError] = useState("");
  const [query, setQuery] = useState(locationName);
  const [results, setResults] = useState<LocationOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [focused, setFocused] = useState(false);
  const skipNextExternalSync = useRef(false);

  useEffect(() => {
    let active = true;
    async function loadStates() {
      const { data, error } = await getSupabaseClient()
        .from("State")
        .select("stateCode, stateName")
        .order("stateName");
      if (!active) return;
      if (error) {
        console.error("Failed to load states:", error);
        setStatesError("Unable to load states.");
      } else {
        setStates((data ?? []).filter((s) => s.stateCode && s.stateName)
          .map((s) => ({ code: s.stateCode, name: s.stateName })));
      }
      setStatesLoading(false);
    }
    void loadStates();
    return () => { active = false; };
  }, []);

  // Sync profile load / Cancel without wiping text while editing a selected city.
  useEffect(() => {
    if (skipNextExternalSync.current) {
      skipNextExternalSync.current = false;
      return;
    }
    setQuery(locationName);
    setResults([]);
  }, [locationName]);

  useEffect(() => {
    if (!stateCode || locationId !== null || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      const { data, error } = await getSupabaseClient()
        .from("Location")
        .select("id, name:locationName, state_code:stateCode")
        .eq("stateCode", stateCode)
        .in("localityType", ["city", "town"])
        .ilike("locationName", `${query.trim()}%`)
        .order("locationName")
        .limit(15);
      if (!active) return;
      if (error) {
        console.error("Location search failed:", error);
        setSearchError("Unable to search locations.");
        setResults([]);
      } else {
        setResults((data ?? []) as unknown as LocationOption[]);
      }
      setSearching(false);
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, stateCode, locationId]);

  function changeState(code: string) {
    setQuery("");
    setResults([]);
    setFocused(false);
    setSearchError("");
    onStateChange(code);
  }

  function changeQuery(value: string) {
    setQuery(value);
    setResults([]);
    setSearchError("");
    if (locationId !== null) {
      skipNextExternalSync.current = true;
      onSelect(null);
    }
  }

  function chooseLocation(item: LocationOption) {
    setQuery(item.name);
    setResults([]);
    setFocused(false);
    onSelect(item);
  }

  return (
    <div style={{ display: "grid", gap: 10, position: "relative", minWidth: 0 }}>
      <div>
        <label htmlFor="profile-state" style={labelStyle}>State</label>
        <select
          id="profile-state"
          style={inputStyle}
          value={stateCode}
          disabled={statesLoading}
          onChange={(event) => changeState(event.target.value)}
        >
          <option value="">{statesLoading ? "Loading states..." : "Select a state"}</option>
          {states.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name} ({state.code})
            </option>
          ))}
        </select>
        {statesError && <small role="alert" style={{ color: "#B42318" }}>{statesError}</small>}
      </div>
      <div style={{ position: "relative" }}>
        <label htmlFor="profile-city" style={labelStyle}>City or Town</label>
        <input
          id="profile-city"
          style={{ ...inputStyle, background: stateCode ? "#FCFDFF" : "#F1F5F9" }}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          disabled={!stateCode}
          autoComplete="off"
          placeholder={stateCode ? "Search cities and towns..." : "Select a state first"}
          role="combobox"
          aria-expanded={focused && results.length > 0}
          aria-controls="profile-location-results"
        />
        {searching && <small style={{ display: "block", marginTop: 5 }}>Searching...</small>}
        {searchError && <small role="alert" style={{ color: "#B42318" }}>{searchError}</small>}
        {focused && results.length > 0 && (
          <div id="profile-location-results" role="listbox" style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
            background: "#FFFFFF", border: "1px solid #DCE5EF", borderRadius: 8,
            maxHeight: 230, overflowY: "auto", boxShadow: "0 8px 20px #1720331A",
          }}>
            {results.map((item) => (
              <button key={item.id} type="button" role="option" aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseLocation(item)}
                style={{ display: "block", width: "100%", padding: "11px 12px",
                  textAlign: "left", background: "white", color: "#172033",
                  border: 0, borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
                {item.name}, {item.state_code}
              </button>
            ))}
          </div>
        )}
        {Boolean(stateCode) && focused && query.trim().length >= 2 && !searching && !searchError && locationId === null && results.length === 0 && (
          <small style={{ display: "block", marginTop: 5, color: "#64748B" }}>No matching cities or towns found.</small>
        )}
      </div>
    </div>
  );
}
