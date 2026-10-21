import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";
import type { EventRecord } from "../../types/event";
import EventCard from "./EventCard";

type Props = { title: string; data: EventRecord[] };

export default function EventSection({ title, data }: Props) {
  if (data.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {data.map((event, index) => (
          <View key={event.eventID} style={index === data.length - 1 ? undefined : styles.cardWrapper}>
            <EventCard event={event} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginBottom: 18 },
  title: { fontSize: 25, fontWeight: "800", color: theme.colors.text, paddingHorizontal: 24, marginBottom: 14 },
  list: { paddingHorizontal: 24, paddingBottom: 5 },
  cardWrapper: { marginRight: 14 },
});