import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide the splash screen once the layout mounts
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack>
      {/* This binds your app/(tabs) group folder to the root stack navigator */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* Example modal screen configuration */}
      <Stack.Screen name="login_sign_up" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
