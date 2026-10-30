
import { Stack } from "expo-router";

export default function EventsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="all_events" />
      <Stack.Screen name="my_events" />
      <Stack.Screen name="create_event" />

      {/* Event Details */}
      <Stack.Screen
        name="[eventID]"
        options={{
          headerShown: false,
          title: "Event Details",
        }}
      />
    </Stack>
  );
}




