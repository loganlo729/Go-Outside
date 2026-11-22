"use client";

// React
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

// Supabase
import { getSupabaseClient } from "../../lib/supabase/client";

// ==================================================
// Types
// ==================================================

// --------------------------------------------------
// Location Option
// --------------------------------------------------

export type LocationOption = {
  id: number;
  name: string;
  state_code: string;
};

// --------------------------------------------------
// State Option
// --------------------------------------------------

type StateOption = {
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
  onSelect: (location: LocationOption | null) => void;

  idPrefix?: string;
};

// ==================================================
// Styles
// ==================================================

// --------------------------------------------------
// Input Styles
// --------------------------------------------------

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",

  padding: "11px 12px",

  background: "#FCFDFF",
  border: "1px solid #DCE5EF",
  borderRadius: 8,

  color: "#172033",
  fontSize: 14,
};

// --------------------------------------------------
// Label Styles
// --------------------------------------------------

const labelStyle: CSSProperties = {
  display: "block",

  marginBottom: 7,

  color: "#465873",
  fontSize: 12,
  fontWeight: 700,
};

// --------------------------------------------------
// Dropdown Styles
// --------------------------------------------------

const dropdownStyle: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 20,

  maxHeight: 230,
  overflowY: "auto",

  background: "#FFFFFF",
  border: "1px solid #DCE5EF",
  borderRadius: 8,

  boxShadow: "0 8px 20px #1720331A",
};

// --------------------------------------------------
// Dropdown Option Styles
// --------------------------------------------------

const optionStyle: CSSProperties = {
  display: "block",
  width: "100%",

  padding: "11px 12px",

  background: "#FFFFFF",
  border: 0,
  borderBottom: "1px solid #F1F5F9",

  color: "#172033",
  textAlign: "left",

  cursor: "pointer",
};

// ==================================================
// Component
// ==================================================

export default function LocationPicker({
  stateCode,
  locationId,
  locationName,
  onStateChange,
  onSelect,
  idPrefix = "profile",
}: Props) {

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [states, setStates] = useState<StateOption[]>([]);

  const [statesLoading, setStatesLoading] = useState(true);

  const [statesError, setStatesError] = useState("");

  // --------------------------------------------------
  // Location Search
  // --------------------------------------------------

  const [query, setQuery] = useState(locationName);

  const [results, setResults] = useState<LocationOption[]>([]);

  const [searching, setSearching] = useState(false);

  const [searchError, setSearchError] = useState("");

  const [focused, setFocused] = useState(false);

  const skipNextExternalSync = useRef(false);

  // --------------------------------------------------
  // Input IDs
  // --------------------------------------------------

  const stateInputID = `${idPrefix}-state`;

  const cityInputID = `${idPrefix}-city`;

  const resultsID = `${idPrefix}-location-results`;

  // ==================================================
  // Load States
  // ==================================================

  useEffect(() => {
    let active = true;

    async function loadStates() {
      const { data, error } = await getSupabaseClient()
        .from("State")
        .select("stateCode, stateName")
        .order("stateName");

      if (!active) return;

      if (error) {
        console.error(
          "Failed to load states:",
          error
        );

        setStatesError("Unable to load states.");
      } else {
        const stateOptions = (data ?? [])
          .filter(
            (state) =>
              state.stateCode &&
              state.stateName
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
  // Sync External Location
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
  // Search Locations
  // ==================================================

  useEffect(() => {

    // --------------------------------------------------
    // Validate Search
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

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");

      const { data, error } = await getSupabaseClient()
        .from("Location")
        .select(
          "id, name:locationName, state_code:stateCode"
        )
        .eq("stateCode", stateCode)
        .in("localityType", ["city", "town"])
        .ilike("locationName", `${query.trim()}%`)
        .order("locationName")
        .limit(15);

      if (!active) return;

      // --------------------------------------------------
      // Handle Search Result
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
          (data ?? []) as unknown as LocationOption[]
        );
      }

      setSearching(false);
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, stateCode, locationId]);

  // ==================================================
  // Handlers
  // ==================================================

  // --------------------------------------------------
  // Change State
  // --------------------------------------------------

  function changeState(code: string) {
    setQuery("");
    setResults([]);
    setFocused(false);
    setSearchError("");

    onStateChange(code);
  }

  // --------------------------------------------------
  // Change Location Query
  // --------------------------------------------------

  function changeQuery(value: string) {
    setQuery(value);
    setResults([]);
    setSearchError("");

    if (locationId !== null) {
      skipNextExternalSync.current = true;
      onSelect(null);
    }
  }

  // --------------------------------------------------
  // Select Location
  // --------------------------------------------------

  function chooseLocation(item: LocationOption) {
    setQuery(item.name);
    setResults([]);
    setFocused(false);

    onSelect(item);
  }

  // ==================================================
  // Render
  // ==================================================

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        position: "relative",
        minWidth: 0,
      }}
    >

      {/* ----------------------------------------
          State Selection
      ---------------------------------------- */}

      <div>
        <label
          htmlFor={stateInputID}
          style={labelStyle}
        >
          State
        </label>

        <select
          id={stateInputID}
          style={inputStyle}
          value={stateCode}
          disabled={statesLoading}
          onChange={(event) =>
            changeState(event.target.value)
          }
        >
          <option value="">
            {statesLoading
              ? "Loading states..."
              : "Select a state"}
          </option>

          {states.map((state) => (
            <option
              key={state.code}
              value={state.code}
            >
              {state.name} ({state.code})
            </option>
          ))}
        </select>

        {statesError && (
          <small
            role="alert"
            style={{ color: "#B42318" }}
          >
            {statesError}
          </small>
        )}
      </div>

      {/* ----------------------------------------
          City or Town Selection
      ---------------------------------------- */}

      <div style={{ position: "relative" }}>
        <label
          htmlFor={cityInputID}
          style={labelStyle}
        >
          City or Town
        </label>

        <input
          id={cityInputID}
          style={{
            ...inputStyle,
            background: stateCode
              ? "#FCFDFF"
              : "#F1F5F9",
          }}
          value={query}
          onChange={(event) =>
            changeQuery(event.target.value)
          }
          onFocus={() => setFocused(true)}
          onBlur={() =>
            window.setTimeout(
              () => setFocused(false),
              150
            )
          }
          disabled={!stateCode}
          autoComplete="off"
          placeholder={
            stateCode
              ? "Search cities and towns..."
              : "Select a state first"
          }
          role="combobox"
          aria-expanded={
            focused && results.length > 0
          }
          aria-controls={resultsID}
        />

        {/* ----------------------------------------
            Search Status
        ---------------------------------------- */}

        {searching && (
          <small
            style={{
              display: "block",
              marginTop: 5,
            }}
          >
            Searching...
          </small>
        )}

        {/* ----------------------------------------
            Search Error
        ---------------------------------------- */}

        {searchError && (
          <small
            role="alert"
            style={{ color: "#B42318" }}
          >
            {searchError}
          </small>
        )}

        {/* ----------------------------------------
            Search Results
        ---------------------------------------- */}

        {focused && results.length > 0 && (
          <div
            id={resultsID}
            role="listbox"
            style={dropdownStyle}
          >
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                onClick={() =>
                  chooseLocation(item)
                }
                style={optionStyle}
              >
                {item.name}, {item.state_code}
              </button>
            ))}
          </div>
        )}

        {/* ----------------------------------------
            No Matching Locations
        ---------------------------------------- */}

        {Boolean(stateCode) &&
          focused &&
          query.trim().length >= 2 &&
          !searching &&
          !searchError &&
          locationId === null &&
          results.length === 0 && (
            <small
              style={{
                display: "block",
                marginTop: 5,
                color: "#64748B",
              }}
            >
              No matching cities or towns found
              within {stateCode}.
            </small>
          )}
      </div>
    </div>
  );
}