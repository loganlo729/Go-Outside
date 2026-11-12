
import { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { useRouter } from "expo-router";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // The Google login/signup handler exchanges
    // the authorization code for a session.
    // This route exists to prevent an unmatched route.
    router.replace("/login_sign_up/login");
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" />
      <Text>Completing Google sign-in...</Text>
    </View>
  );
}
