import { ReactNode } from "react";
import {
  SafeAreaView,
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
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </SafeAreaView>
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