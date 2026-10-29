
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";

type Props = {
  name: string;
  location: string;
  memberSince: string;
  accentColor: string;
  userId: string;
  avatarPath: string | null;
  onAvatarUploaded: (path: string) => void;
};

export default function ProfileBanner({
  name,
  location,
  memberSince,
  accentColor,
  userId,
  avatarPath,
  onAvatarUploaded,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "U";

  const avatarUrl = avatarPath
    ? supabase.storage
        .from("avatars")
        .getPublicUrl(avatarPath).data.publicUrl
    : null;

  async function handleAvatarUpload() {
    if (uploading) return;

    setError("");

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError("Photo library permission is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets.length) return;

      setUploading(true);

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
        throw new Error("Profile pictures must be smaller than 5 MB.");
      }

      const mimeType = asset.mimeType ?? "image/jpeg";

      if (
        !["image/jpeg", "image/png", "image/webp"].includes(mimeType)
      ) {
        throw new Error("Choose a JPG, PNG, or WebP image.");
      }

      const extension =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
            ? "webp"
            : "jpg";

      const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error: profileError } = await supabase
        .from("Profile")
        .update({ profilePicturePath: filePath })
        .eq("userID", userId)
        .select("profilePicturePath")
        .single();

      if (profileError) throw profileError;

      onAvatarUploaded(data.profilePicturePath);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload profile picture."
      );
    } finally {
      setUploading(false);
    }
  }

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
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>

          <Pressable
            style={styles.uploadButton}
            onPress={() => void handleAvatarUpload()}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            {uploading ? (
              <ActivityIndicator
                size="small"
                color={accentColor}
              />
            ) : (
              <Text style={styles.uploadButtonText}>
                Change Photo
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.details}>
          Member since {memberSince}
          {location ? ` • ${location}` : ""}
        </Text>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}
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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  name: {
    flex: 1,
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
  uploadButton: {
    borderWidth: 1,
    borderColor: "#DCE5EF",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 105,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "700",
  },
  error: {
    color: "#B42318",
    fontSize: 12,
    marginTop: 8,
  },
});
