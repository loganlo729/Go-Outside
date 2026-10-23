import { StyleSheet, Text, View } from "react-native";

type Props = {
  name: string;
  location: string;
  memberSince: string;
  accentColor: string;
};

export default function ProfileBanner({
  name,
  location,
  memberSince,
  accentColor,
}: Props) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "U";

  return (
    <View style={styles.banner}>
      <View style={styles.cover}>
        <View style={styles.coverCircleOne} />
        <View style={styles.coverCircleTwo} />
        <View style={styles.coverCircleThree} />
      </View>

      <View style={styles.identity}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: accentColor },
          ]}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.name}>{name}</Text>

        <Text style={styles.details}>
          Member since {memberSince}
          {location ? ` • ${location}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  cover: {
    height: 135,
    backgroundColor: "#087F89",
    overflow: "hidden",
  },
  coverCircleOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#35B9BA",
    top: -190,
    right: -40,
  },
  coverCircleTwo: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#09506B",
    top: 25,
    left: -100,
  },
  coverCircleThree: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#7DE2E0",
    opacity: 0.45,
    top: -85,
    left: 110,
  },
  identity: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    alignItems: "flex-start",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -41,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },
  name: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: "#172033",
  },
  details: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
});