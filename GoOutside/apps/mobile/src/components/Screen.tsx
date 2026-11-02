import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReactNode } from "react";
import {
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

type ScreenProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export default function Screen({ children, style }: ScreenProps) {
  return (
    <SafeAreaProvider>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
});