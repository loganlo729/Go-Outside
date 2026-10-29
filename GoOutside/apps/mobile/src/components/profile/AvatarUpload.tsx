
import { useEffect, useState } from "react";
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
  userId: string;
  initialPath: string | null;
  displayName: string;
  accentColor?: string;
  onUploaded?: (path: string) => void;
};

export default function AvatarUpload({
  userId,
  initialPath,
  displayName,
  accentColor = "#0D9488",
  onUploaded,
}: Props) {
  const [avatarPath, setAvatarPath] = useState(initialPath);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAvatarPath(initialPath);
  }, [initialPath]);

  const avatarUrl = avatarPath
    ? supabase.storage
        .from("avatars")
        .getPublicUrl(avatarPath).data.publicUrl
    : null;

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "U";

  async function pickAvatar() {
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

      const asset = result.assets[0];

      setUploading(true);

      const response = await fetch(asset.uri);
      const bytes = await response.arrayBuffer();

      if (bytes.byteLength > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5 MB.");
      }

      const mimeType = asset.mimeType ?? "image/jpeg";

      if (
        !["image/jpeg", "image/png", "image/webp"].includes(mimeType)
      ) {
        throw new Error("Please choose a JPG, PNG, or WebP image.");
      }

      const extension =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
            ? "webp"
            : "jpg";

      const filePath =
        `${userId}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, bytes, {
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

      setAvatarPath(data.profilePicturePath);
      onUploaded?.(data.profilePicturePath);
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
    <View style={styles.container}>
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
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>

        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.caption}>Profile picture</Text>
        </View>
      </View>

      <Pressable
        style={styles.button}
        onPress={() => void pickAvatar()}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Change profile picture"
      >
        {uploading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <Text style={styles.buttonText}>Change Photo</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
  },
  identity: {
    flex: 1,
    minWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  initials: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
  },
  caption: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
  },
  button: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  buttonText: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "700",
  },
  error: {
    width: "100%",
    color: "#B42318",
    fontSize: 12,
  },
});
