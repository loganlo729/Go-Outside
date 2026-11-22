import React from "react";
import { Stack } from "expo-router";

export default function CommunitiesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#F6F8F3",
        },
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen name="all_communities" />

      <Stack.Screen name="my_communities" />

      <Stack.Screen name="[communityID]" />

      <Stack.Screen name="create_community" />

      <Stack.Screen name="category/[categoryID]" />
    </Stack>
  );
}