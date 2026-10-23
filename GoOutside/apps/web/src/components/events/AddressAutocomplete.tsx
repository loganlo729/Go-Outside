
"use client";

import { useEffect, useState } from "react";

import styles from "./AddressAutocomplete.module.css";
//import styles from "./EventDashboard.module.css";

// --------------------------------------------------
// Types
// --------------------------------------------------

interface AddressSuggestion {
  formatted: string;
  lat?: number;
  lon?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// --------------------------------------------------
// Address Autocomplete
// --------------------------------------------------

export default function AddressAutocomplete({
  value,
  onChange,
  disabled = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<
    AddressSuggestion[]
  >([]);

  const [selectedAddress, setSelectedAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Fetch Suggestions
  // --------------------------------------------------

  useEffect(() => {
    const query = value.trim();

    if (
      disabled ||
      query.length < 3 ||
      value === selectedAddress
    ) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/address-autocomplete?text=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Unable to search addresses.");
        }

        const data: {
          results: AddressSuggestion[];
        } = await response.json();

        if (!controller.signal.aborted) {
          setSuggestions(data.results);
          setOpen(true);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setError("Address suggestions are unavailable.");
          setOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value, disabled, selectedAddress]);

  // --------------------------------------------------
  // Handle Address Selection
  // --------------------------------------------------

  function selectAddress(address: AddressSuggestion) {
    setSelectedAddress(address.formatted);
    onChange(address.formatted);

    setSuggestions([]);
    setOpen(false);
    setError("");
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  const showDropdown =
    open &&
    (suggestions.length > 0 || loading || !!error);

  return (
    <div
      className={styles.wrapper}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <input
        id="eventLocation"
        type="text"
        className={styles.input}
        value={value}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls="address-suggestions"
        placeholder="Start typing an address..."
        onChange={(event) => {
          setSelectedAddress("");
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
      />

      {/* Suggestions Dropdown */}

      {showDropdown && (
        <div
          id="address-suggestions"
          className={styles.dropdown}
          role="listbox"
          aria-label="Suggested addresses"
        >
          {loading && (
            <div className={styles.message}>
              Searching addresses...
            </div>
          )}

          {error && (
            <div className={styles.message} role="status">
              {error}
            </div>
          )}

          {!loading &&
            suggestions.map((address, index) => (
              <button
                key={`${address.formatted}-${index}`}
                type="button"
                role="option"
                aria-selected={false}
                className={styles.suggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectAddress(address)}
              >
                <span className={styles.pin}>⌖</span>

                <span>{address.formatted}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
