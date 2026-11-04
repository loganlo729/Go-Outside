// React
import React, { useState } from "react";

// UI components
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Filter component
import FilterChip from "../ui/FilterChip";

// Event filter types
import type {
  CategoryRecord,
  DateFilter,
} from "../../types/event";


// --------------------------------------------------
// Props
// --------------------------------------------------
type Props = {
  categories: CategoryRecord[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
  dateFilter: DateFilter;
  onSelectDate: (date: DateFilter) => void;
};

// --------------------------------------------------
// Event Filters
// --------------------------------------------------
export default function EventFilters({
  categories,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
  dateFilter,
  onSelectDate,
}: Props) {
  // Dropdown visibility
  const [dropdownOpen, setDropdownOpen] =
    useState(false);

  return (
    <>
      {/* Category Dropdown */}
      <Pressable
        style={styles.dropdownButton}
        onPress={() =>
          setDropdownOpen((previous) => !previous)
        }
        accessibilityRole="button"
        accessibilityState={{
          expanded: dropdownOpen,
        }}
      >
        <Text
          style={
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
          </Text>

        <Text style={styles.dropdownArrow}>
          {dropdownOpen ? "▲" : "▼"}
        </Text>
      </Pressable>

      {/* Category Options */}
      {dropdownOpen && (
        <View style={styles.dropdownMenu}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>
              Select Categories
            </Text>

            <Pressable
              onPress={onClearCategories}
              accessibilityRole="button"
            >
              <Text style={styles.clearText}>
                Clear All
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.categoryList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {categories.map((category) => {
              const selected =
                selectedCategories.includes(
                  category.categoryID
                );

              return (
                <Pressable
                  key={category.categoryID}
                  style={styles.categoryOption}
                  onPress={() =>
                    onToggleCategory(category.categoryID)
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: selected,
                  }}
                >
                  {/* Checkbox */}
                  <View
                    style={[
                      styles.checkbox,
                      selected && styles.checkboxSelected,
                    ]}
                  >
                    {selected && (
                      <Text style={styles.checkmark}>
                        ✓
                      </Text>
                    )}
                  </View>

                  <Text style={styles.categoryText}>
                    {category.categoryName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Close Dropdown */}
          <Pressable
            style={styles.doneButton}
            onPress={() => setDropdownOpen(false)}
          >
            <Text style={styles.doneText}>
              Done
            </Text>
          </Pressable>
        </View>
      )}



      {/* Date Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dates}
      >
        <FilterChip
          label="Any Date"
          selected={dateFilter === "all"}
          onPress={() => onSelectDate("all")}
        />

        <FilterChip
          label="Within 2 Weeks"
          selected={dateFilter === "twoWeeks"}
          onPress={() => onSelectDate("twoWeeks")}
        />

        <FilterChip
          label="Within 1 Month"
          selected={dateFilter === "month"}
          onPress={() => onSelectDate("month")}
        />
      </ScrollView>
    </>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------
const styles = StyleSheet.create({
// Category Dropdown
  dropdownButton: {
    marginHorizontal: 18,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#CFD6CB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dropdownSelectedText: {
    fontWeight: 700,
    color:"#31988F",
  },

  dropdownText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2E22",
  },

  dropdownArrow: {
    fontSize: 12,
    color: "#3F6D3F",
  },

  dropdownMenu: {
    marginHorizontal: 18,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#D8DDD4",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EA",
  },

  dropdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2E22",
  },

  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#31988F",
  },

  categoryList: {
    maxHeight: 240,
  },

  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#B9C6BC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxSelected: {
    backgroundColor: "#31988F",
    borderColor: "#31988F",
  },

  checkmark: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  categoryText: {
    fontSize: 14,
    color: "#1F2E22",
  },

  doneButton: {
    backgroundColor: "#31988F",
    paddingVertical: 13,
    alignItems: "center",
  },

  doneText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },


  dates: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
});
