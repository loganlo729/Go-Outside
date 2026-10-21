import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import FilterChip from "../UI/FilterChip";
import type { CategoryRecord, DateFilter } from "../../types/event";

type Props = {
  categories: CategoryRecord[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  dateFilter: DateFilter;
  onSelectDate: (date: DateFilter) => void;
};

export default function EventFilters({ categories, selectedCategory, onSelectCategory, dateFilter, onSelectDate }: Props) {
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories} contentContainerStyle={styles.categoryContent}>
        <FilterChip label="All Categories" selected={selectedCategory === "all"} onPress={() => onSelectCategory("all")} />
        {categories.map(category => (
          <FilterChip key={category.categoryID} label={category.categoryName} selected={selectedCategory === category.categoryID} onPress={() => onSelectCategory(category.categoryID)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
        <FilterChip label="Any Date" selected={dateFilter === "all"} onPress={() => onSelectDate("all")} />
        <FilterChip label="Within 2 Weeks" selected={dateFilter === "twoWeeks"} onPress={() => onSelectDate("twoWeeks")} />
        <FilterChip label="Within 1 Month" selected={dateFilter === "month"} onPress={() => onSelectDate("month")} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  categories: { maxHeight: 58, marginTop: 8 },
  categoryContent: { alignItems: "center", paddingHorizontal: 18, gap: 8 },
  dates: { flexDirection: "row", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, gap: 8 },
});
