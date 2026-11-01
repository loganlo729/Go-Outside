// React
import React from "react";

// UI components
import {
  ScrollView,
  StyleSheet,
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
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  dateFilter: DateFilter;
  onSelectDate: (date: DateFilter) => void;
};

// --------------------------------------------------
// Event Filters
// --------------------------------------------------

export default function EventFilters({
  categories,
  selectedCategory,
  onSelectCategory,
  dateFilter,
  onSelectDate,
}: Props) {
  return (
    <>
      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={styles.categoryContent}
      >
        <FilterChip
          label="All Categories"
          selected={selectedCategory === "all"}
          onPress={() => onSelectCategory("all")}
        />

        {categories.map((category) => (
          <FilterChip
            key={category.categoryID}
            label={category.categoryName}
            selected={
              selectedCategory === category.categoryID
            }
            onPress={() =>
              onSelectCategory(category.categoryID)
            }
          />
        ))}
      </ScrollView>

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
  categories: {
    maxHeight: 58,
    marginTop: 8,
  },

  categoryContent: {
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 8,
  },

  dates: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
});
