import React, { useState } from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  CommunityCategory,
} from "../../services/communities";

// --------------------------------------------------
// Props
// --------------------------------------------------

type Props = {
  categories: CommunityCategory[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
};

// --------------------------------------------------
// Community Filters
// --------------------------------------------------

export default function CommunityFilters({
  categories,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      {/* Category Dropdown */}

      <Pressable
        style={styles.dropdownButton}
        onPress={() => setExpanded((previous) => !previous)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.dropdownText}>
          {selectedCategories.length === 0
            ? "All Categories"
            : `${selectedCategories.length} ${
                selectedCategories.length === 1
                  ? "Category"
                  : "Categories"
              } Selected`}
        </Text>

        <Text style={styles.arrow}>
          {expanded ? "▲" : "▼"}
        </Text>
      </Pressable>

      {/* Category Options */}

      {expanded && (
        <View style={styles.dropdownMenu}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>
              Select Categories
            </Text>

            <Pressable onPress={onClearCategories}>
              <Text style={styles.clearText}>
                Clear All
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.categoryList}
            nestedScrollEnabled
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
                    onToggleCategory(
                      category.categoryID
                    )
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: selected,
                  }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selected && styles.checkedBox,
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

          <Pressable
            style={styles.doneButton}
            onPress={() => setExpanded(false)}
          >
            <Text style={styles.doneText}>
              Done
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 24,
  },

  dropdownButton: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D5DDD2",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dropdownText: {
    color: "#18232B",
    fontSize: 15,
    fontWeight: "700",
  },

  arrow: {
    color: "#18232B",
    fontSize: 13,
  },

  dropdownMenu: {
    marginTop: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D8E1D8",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
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
    color: "#18232B",
    fontWeight: "700",
    fontSize: 14,
  },

  clearText: {
    color: "#31988F",
    fontWeight: "700",
    fontSize: 13,
  },

  categoryList: {
    maxHeight: 240,
  },

  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  checkbox: {
    width: 19,
    height: 19,
    borderWidth: 1,
    borderColor: "#9CAEA1",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  checkedBox: {
    backgroundColor: "#31988F",
    borderColor: "#31988F",
  },

  checkmark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  categoryText: {
    color: "#18232B",
    fontSize: 14,
  },

  doneButton: {
    backgroundColor: "#31988F",
    padding: 13,
    alignItems: "center",
  },

  doneText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});