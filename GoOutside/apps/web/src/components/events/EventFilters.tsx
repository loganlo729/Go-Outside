"use client";

// React hooks
import { useState } from "react";

// Event filter types
import type {
  CategoryRecord,
  DateFilter,
} from "../../types/event";

// Component styles
import styles from "./EventDashboard.module.css";



type Props = {
  categories: CategoryRecord[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
  dateFilter: DateFilter;
  onDateChange: (value: DateFilter) => void;
};

export default function EventFilters({
  categories,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
  dateFilter,
  onDateChange,
}: Props) {
  // Dropdown visibility
  const [dropdownOpen, setDropdownOpen] =
    useState(false);
  return (
    <div className={styles.filters}>
       {/* Category Dropdown */}

      <div className={styles.categoryDropdown}>
        <button
          type="button"
          className={styles.dropdownButton}
          onClick={() =>
            setDropdownOpen((previous) => !previous)
          }
          aria-expanded={dropdownOpen}
        >
          <span
            className={
              selectedCategories.length > 0
                ? styles.dropdownSelectedText
                : undefined
            }
          >
            {selectedCategories.length === 0
              ? "All Categories"
              : `${selectedCategories.length} ${
                  selectedCategories.length === 1
                    ? "Category"
                    : "Categories"
                } Selected`}
          </span>


          <span aria-hidden="true">
            {dropdownOpen ? "▲" : "▼"}
          </span>
        </button>

        {/* Category Options */}

        {dropdownOpen && (
          <div className={styles.dropdownMenu}>
            <div className={styles.dropdownHeader}>
              <span>Select Categories</span>

              <button
                type="button"
                className={styles.clearCategories}
                onClick={onClearCategories}
              >
                Clear All
              </button>
            </div>

            <div className={styles.categoryOptions}>
              {categories.map((category) => (
                <label
                  key={category.categoryID}
                  className={styles.categoryOption}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(
                      category.categoryID
                    )}
                    onChange={() =>
                      onToggleCategory(category.categoryID)
                    }
                  />

                  <span>{category.categoryName}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              className={styles.dropdownDone}
              onClick={() => setDropdownOpen(false)}
            >
              Done
            </button>
          </div>
        )}
      </div>


      {/* Date Filters */}

      <div
        className={styles.filterRail}
        aria-label="Dates"
      >
        {(
          [
            ["all", "Any Date"],
            ["twoWeeks", "Within 2 Weeks"],
            ["month", "Within 1 Month"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={dateFilter === value}
            onClick={() => onDateChange(value)}
            className={styles.chip}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
