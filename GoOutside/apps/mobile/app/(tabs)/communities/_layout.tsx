import { Stack } from "expo-router";

export default function CommunitiesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="all_communities" />
      <Stack.Screen name="my_communities" />
    </Stack>
  );
}