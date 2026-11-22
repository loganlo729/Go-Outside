// React Native
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Icons
import { Ionicons } from "@expo/vector-icons";

// Types
import type {
  CommunityCategory,
} from "../../types/community";

// ==================================================
// Props
// ==================================================

type Props = {
  categories: CommunityCategory[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
};

// ==================================================
// Component
// ==================================================

export default function CommunityFilter({
  categories,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      {/* Dropdown Button */}

      <Pressable
        style={styles.dropdownButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.dropdownText}>
          {selectedCategories.length === 0
            ? "All Categories"
            : `${selectedCategories.length} Categories Selected`}
        </Text>

        <Ionicons
          name={
            expanded
              ? "chevron-up"
              : "chevron-down"
          }
          size={18}
          color="#1F2E22"
        />
      </Pressable>

      {/* Category Options */}

      {expanded && (
        <View style={styles.optionsContainer}>
          <View style={styles.optionsHeader}>
            <Text style={styles.headerText}>
              Select Categories
            </Text>

            <Pressable onPress={onClearCategories}>
              <Text style={styles.clearText}>
                Clear
              </Text>
            </Pressable>
          </View>

          <FlatList
            data={categories}
            scrollEnabled={false}
            keyExtractor={(item) => item.categoryID}
            renderItem={({ item }) => {
              const selected =
                selectedCategories.includes(
                  item.categoryID
                );

              return (
                <Pressable
                  style={styles.option}
                  onPress={() =>
                    onToggleCategory(item.categoryID)
                  }
                >
                  <Ionicons
                    name={
                      selected
                        ? "checkbox"
                        : "square-outline"
                    }
                    size={21}
                    color={
                      selected
                        ? "#31988F"
                        : "#748379"
                    }
                  />

                  <Text style={styles.optionText}>
                    {item.categoryName}
                  </Text>
                </Pressable>
              );
            }}
          />

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

// ==================================================
// Styles
// ==================================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
  },

  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFD6CB",
    borderRadius: 11,
    padding: 14,
  },

  dropdownText: {
    color: "#1F2E22",
    fontSize: 14,
    fontWeight: "700",
  },

  optionsContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DDD4",
    borderRadius: 11,
    marginTop: 6,
    overflow: "hidden",
  },

  optionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EA",
  },

  headerText: {
    color: "#1F2E22",
    fontSize: 14,
    fontWeight: "700",
  },

  clearText: {
    color: "#31988F",
    fontSize: 13,
    fontWeight: "700",
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  optionText: {
    color: "#1F2E22",
    fontSize: 14,
  },

  doneButton: {
    backgroundColor: "#31988F",
    alignItems: "center",
    padding: 13,
  },

  doneText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});