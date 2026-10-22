
import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppSearchInput from "../../../src/components/ui/AppSearchInput";
import EventFilters from "../../../src/components/events/EventFilters";
import EventSection from "../../../src/components/events/EventSection";

import { theme } from "../../../src/constants/theme";
import { useEvents } from "../../../src/hooks/useEvents";
import type { DateFilter } from "../../../src/types/event";

export default function AllEventsScreen() {
  const router = useRouter();

  const {
    events,
    categories,
    loading,
    refreshing,
    error,
    refresh,
    retry,
  } = useEvents();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");

  // Filter database events
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    const now = new Date();
    const deadline = new Date(now);

    if (dateFilter === "twoWeeks") {
      deadline.setDate(deadline.getDate() + 14);
    }

    if (dateFilter === "month") {
      deadline.setMonth(deadline.getMonth() + 1);
    }

    return events.filter((event) => {
      const matchesSearch =
        !query ||
        [
          event.eventTitle,
          event.eventDescription,
          event.eventLocation,
        ].some((value) =>
          (value ?? "").toLowerCase().includes(query)
        );

      const matchesCategory =
        selectedCategory === "all" ||
        event.categoryID === selectedCategory;

      const date = event.eventStartTime
        ? new Date(event.eventStartTime)
        : null;

      const matchesDate =
        dateFilter === "all" ||
        Boolean(
          date &&
          date >= now &&
          date <= deadline
        );

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDate
      );
    });
  }, [
    events,
    search,
    selectedCategory,
    dateFilter,
  ]);

  const featuredEvents = useMemo(
    () => filteredEvents.filter(
      (event) => event.isFeatured
    ),
    [filteredEvents]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
        />
        <Text style={styles.loading}>
          Loading events...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Text style={styles.header}>
          Events
        </Text>

        <AppSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search local events..."
        />

        {/* Dashboard navigation */}
        <View style={styles.tabs}>
          <View style={styles.activeTab}>
            <Text style={styles.activeTabText}>
              All Events
            </Text>
          </View>

          <Pressable
            style={styles.inactiveTab}
            onPress={() =>
              router.push("/events/my_events")
            }
            accessibilityRole="button"
          >
            <Text style={styles.inactiveTabText}>
              My Events
            </Text>
          </Pressable>
        </View>

        {/* Reusable filters */}
        <EventFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          dateFilter={dateFilter}
          onSelectDate={setDateFilter}
        />

        {/* Database errors */}
        {!!error && (
          <View style={styles.message}>
            <Text style={styles.error}>
              {error}
            </Text>

            <Pressable
              onPress={retry}
              accessibilityRole="button"
            >
              <Text style={styles.retry}>
                Retry
              </Text>
            </Pressable>
          </View>
        )}

        {/* Empty state */}
        {!error && filteredEvents.length === 0 && (
          <View style={styles.message}>
            <Text style={styles.emptyTitle}>
              No events found
            </Text>

            <Text style={styles.emptyText}>
              Try adjusting your search or filters.
            </Text>
          </View>
        )}

        {/* Horizontally scrollable sections */}
        {!error && (
          <>
            <EventSection
              title="Featured"
              data={featuredEvents}
            />

            {categories
              .filter(
                (category) =>
                  selectedCategory === "all" ||
                  selectedCategory ===
                    category.categoryID
              )
              .map((category) => (
                <EventSection
                  key={category.categoryID}
                  title={category.categoryName}
                  data={filteredEvents.filter(
                    (event) =>
                      event.categoryID ===
                      category.categoryID
                  )}
                />
              ))}
          </>
        )}

        <View style={styles.bottom} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scroll: {
    flex: 1,
  },

  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  loading: {
    marginTop: 12,
    color: theme.colors.secondaryText,
    fontSize: 14,
  },

  header: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 18,
  },

  tabs: {
    height: 52,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    paddingHorizontal: 24,
    alignItems: "center",
  },

  activeTab: {
    height: "100%",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    marginRight: 25,
  },

  activeTabText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },

  inactiveTab: {
    height: "100%",
    justifyContent: "center",
  },

  inactiveTabText: {
    color: "#53617A",
    fontSize: 14,
  },

  message: {
    padding: 24,
    alignItems: "center",
  },

  error: {
    color: theme.colors.error,
    marginBottom: 12,
    textAlign: "center",
    fontSize: 13,
  },

  retry: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },

  emptyText: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    marginTop: 8,
    textAlign: "center",
  },

  bottom: {
    height: 35,
  },
});

