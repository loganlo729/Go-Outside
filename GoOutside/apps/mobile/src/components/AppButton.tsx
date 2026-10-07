import {
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "tertiary";
};


export default function AppButton({
  title,
  onPress,
  variant = "primary",
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary"
          ? styles.secondary
          : variant === "tertiary"
          ? styles.tertiary
          : styles.primary,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "secondary" && styles.secondaryText,
          variant === "tertiary" && styles.tertiaryText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },

  primary: {
    backgroundColor: "#315C3A",
  },

  secondary: {
    backgroundColor: "#E4EADF",
  },

  tertiary: {
    backgroundColor: "#F2F4F0",
  },

  pressed: {
    opacity: 0.75,
  },

  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryText: {
    color: "#315C3A",
  },

  tertiaryText: {
    color: "#687269",
  },
});