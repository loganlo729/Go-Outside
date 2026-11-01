import { Stack } from "expo-router";

// --------------------------------------------------
// Events Navigation Layout
// --------------------------------------------------

// Defines the navigation stack for all event related screens, including event dashboards and details

export default function EventsLayout() {
  return (
    <Stack
      screenOptions={{
        // Hide default headers since each screen manages its own navigation and page layout
        headerShown: false,

        contentStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      {/* Main Events Dashboard */}
      <Stack.Screen name="index" />

      {/* Browse All Published Events */}
      <Stack.Screen name="all_events" />

      {/* View Created Events and RSVPs */}
      <Stack.Screen name="my_events" />

      {/* Create a New Event */}
      <Stack.Screen name="create_event" />

      {/* View an Individual Event Using Its ID */}
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




