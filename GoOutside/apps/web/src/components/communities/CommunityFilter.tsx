"use client";

// React hooks
import { useState } from "react";

// Types
import type {
  CommunityCategoryRecord,
} from "../../types/community";

// Styles
import styles from "./CommunityDashboard.module.css";

// --------------------------------------------------
// Props
// --------------------------------------------------

type Props = {
  categories: CommunityCategoryRecord[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
};

// --------------------------------------------------
// Community Filters
// --------------------------------------------------

export default function CommunityFilter({
  categories,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
}: Props) {
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

                  <span>
                    {category.categoryName}
                  </span>
                </label>
              ))}
            </div>

            <button
              type="button"
              className={styles.dropdownDone}
              onClick={() =>
                setDropdownOpen(false)
              }
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}