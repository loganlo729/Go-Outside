import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useRouter,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

// Image Picker
import * as ImagePicker from "expo-image-picker";

// Icons
import { Ionicons } from "@expo/vector-icons";

// Components
import LocationPicker from "../../../src/components/common/LocationPicker";

import type {
  Location,
} from "../../../src/components/common/LocationPicker";

// Services
import {
  createCommunity,
  getCommunityCategories,
  getCommunityUserID,
  type CommunityImage,
} from "../../../src/services/communities";

// Types
import type {
  CommunityCategory,
  CommunityLocation,
  CommunityStatus,
  CommunityAccessType,
} from "../../../src/types/community";

// ==================================================
// Constants
// ==================================================

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// ==================================================
// Types
// ==================================================

type PrivateAccess =
  | "invite"
  | "request";

// ==================================================
// Component
// ==================================================

export default function CreateCommunityScreen() {
  const router = useRouter();

  // ==================================================
  // Community Information
  // ==================================================

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [categoryID, setCategoryID] =
    useState("");

  // ==================================================
  // Categories
  // ==================================================

  const [categories, setCategories] =
    useState<CommunityCategory[]>([]);

  const [categoryExpanded, setCategoryExpanded] =
    useState(false);

  // ==================================================
  // Location
  // ==================================================

  const [stateCode, setStateCode] =
    useState("");

  const [locationID, setLocationID] =
    useState<number | null>(null);

  const [locationName, setLocationName] =
    useState("");

  // ==================================================
  // Community Image
  // ==================================================

  const [image, setImage] =
    useState<CommunityImage | null>(null);

  // ==================================================
  // Visibility
  // ==================================================

  const [visibility, setVisibility] =
    useState<CommunityAccessType>("public");

  const [privateAccess, setPrivateAccess] =
    useState<PrivateAccess>("invite");

  // ==================================================
  // Form State
  // ==================================================

  const [loading, setLoading] =
    useState(true);

  const [savingAction, setSavingAction] =
    useState<CommunityStatus | null>(null);

  const [error, setError] =
    useState("");

  const saving = savingAction !== null;

  // ==================================================
  // Load Categories
  // ==================================================

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const userID =
          await getCommunityUserID();

        if (!userID) {
          throw new Error(
            "You must be signed in to create a community."
          );
        }

        const result =
          await getCommunityCategories();

        if (active) {
          setCategories(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load categories."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  // ==================================================
  // Image Picker
  // ==================================================

  const pickImage = useCallback(async () => {
    if (saving) {
      return;
    }

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.85,
          base64: true,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset?.base64) {
        Alert.alert(
          "Image Error",
          "Unable to process the selected image."
        );
        return;
      }

      if (
        asset.fileSize &&
        asset.fileSize > MAX_IMAGE_SIZE
      ) {
        Alert.alert(
          "Image Too Large",
          "Please select an image smaller than 10 MB."
        );
        return;
      }

      const mimeType =
        asset.mimeType ?? "image/jpeg";

      // This implementation stores JPEG images.
      // Expo's editor generally returns a JPEG,
      // but reject other formats rather than
      // storing them with an incorrect extension.

      if (mimeType !== "image/jpeg") {
        Alert.alert(
          "Image Format",
          "Please select a JPEG photo."
        );
        return;
      }

      setImage({
        uri: asset.uri,
        base64: asset.base64,
        mimeType,
        size: asset.fileSize ?? 0,
      });
    } catch (err) {
      Alert.alert(
        "Image Error",
        err instanceof Error
          ? err.message
          : "Unable to select image."
      );
    }
  }, [saving]);

  // ==================================================
  // Location
  // ==================================================

  function handleStateChange(code: string) {
    setStateCode(code);
    setLocationID(null);
    setLocationName("");
  }

  function handleLocationChange(
    location: Location | null
    ) {
    setLocationID(location?.id ?? null);

    setLocationName(location?.name ?? "");
    }

  // ==================================================
  // Visibility
  // ==================================================

  function handleVisibilityChange(
    value: CommunityAccessType
  ) {
    setVisibility(value);

    if (value === "public") {
      setPrivateAccess("invite");
    }
  }

  // ==================================================
  // Save Community
  // ==================================================

  async function handleSave(
    action: CommunityStatus
  ) {
    if (saving || loading) {
      return;
    }

    setError("");

    const cleanTitle = title.trim();
    const cleanDescription =
      description.trim();

    // ----------------------------------------
    // Title Validation
    // ----------------------------------------

    if (!cleanTitle) {
      setError(
        "Community title is required."
      );
      return;
    }

    if (
      cleanTitle.length >
      MAX_TITLE_LENGTH
    ) {
      setError(
        "Community title cannot exceed 150 characters."
      );
      return;
    }

    // ----------------------------------------
    // Description Validation
    // ----------------------------------------

    if (
      cleanDescription.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      setError(
        "Community description cannot exceed 2000 characters."
      );
      return;
    }

    // ----------------------------------------
    // Publishing Validation
    // ----------------------------------------

    if (action === "publicActive") {
      if (!categoryID) {
        setError(
          "Please select a category."
        );
        return;
      }

      if (!cleanDescription) {
        setError(
          "Community description is required."
        );
        return;
      }

      if (!stateCode) {
        setError(
          "Please select a state."
        );
        return;
      }
    }

    // ----------------------------------------
    // Visibility Settings
    // ----------------------------------------

    const isPublic =
      visibility === "public";

    const allowJoinRequests =
      !isPublic &&
      privateAccess === "request";

    const allowInviteCodes =
      !isPublic &&
      privateAccess === "invite";

    // ----------------------------------------
    // Save
    // ----------------------------------------

    setSavingAction(action);

    try {
      const communityID =
        await createCommunity(
          {
            communityTitle:
              cleanTitle,

            communityDescription:
              cleanDescription || null,

            categoryID:
              categoryID || null,

            stateCode:
              stateCode || null,

            locationID,

            accessType:
              visibility,

            allowJoinRequests,

            allowInviteCodes,

            status: action,
          },
          image
        );

      // ----------------------------------------
      // Navigate to Community
      // ----------------------------------------

      router.replace({
        pathname:
          "/communities/[communityID]",
        params: {
          communityID,
          from: "my_communities",
        },
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save community.";

      setError(message);

      Alert.alert(
        "Unable to Save Community",
        message
      );
    } finally {
      setSavingAction(null);
    }
  }

  // ==================================================
  // Selected Category
  // ==================================================

  const selectedCategory =
    categories.find(
      (category) =>
        category.categoryID === categoryID
    );

  // ==================================================
  // Render
  // ==================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ----------------------------------------
            Header
        ---------------------------------------- */}

        <Text style={styles.eyebrow}>
          GO OUTSIDE
        </Text>

        <Text style={styles.pageTitle}>
          Create a Community
        </Text>

        <Text style={styles.subtitle}>
          Bring people together around shared
          interests and activities.
        </Text>

        {/* ----------------------------------------
            Community Title
        ---------------------------------------- */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Community Title <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="Enter community name"
            placeholderTextColor="#9AA69A"
          />

          <Text style={styles.counter}>
            {title.length}/{MAX_TITLE_LENGTH}
          </Text>
        </View>

        {/* ----------------------------------------
            Category
        ---------------------------------------- */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>

          <Pressable
            style={styles.inputButton}
            onPress={() =>
              setCategoryExpanded(
                !categoryExpanded
              )
            }
          >
            <Text style={styles.inputButtonText}>
              {selectedCategory?.categoryName ||
                "Select a category"}
            </Text>

            <Ionicons
              name={
                categoryExpanded
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={18}
              color="#63715F"
            />
          </Pressable>

          {categoryExpanded && (
            <View style={styles.dropdown}>
              {categories.map((category) => (
                <Pressable
                  key={category.categoryID}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setCategoryID(
                      category.categoryID
                    );

                    setCategoryExpanded(false);
                  }}
                >
                  <Text
                    style={styles.dropdownText}
                  >
                    {category.categoryName}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ----------------------------------------
            Description
        ---------------------------------------- */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Community Description <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.descriptionInput,
            ]}
            value={description}
            onChangeText={setDescription}
            maxLength={MAX_DESCRIPTION_LENGTH}
            multiline
            textAlignVertical="top"
            placeholder="Describe your community, its purpose, and what members can expect..."
            placeholderTextColor="#9AA69A"
          />

          <Text style={styles.counter}>
            {description.length}/
            {MAX_DESCRIPTION_LENGTH}
          </Text>
        </View>

        {/* ----------------------------------------
            Community Location
        ---------------------------------------- */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Community Location 
          </Text>

          <Text style={styles.sectionDescription}>
            Select a state. A city or town is
            optional for statewide communities.
          </Text>

          <LocationPicker
            stateCode={stateCode}
            locationId={locationID}
            locationName={locationName}
            onStateChange={handleStateChange}
            onSelect={handleLocationChange}
            />
        </View>

        {/* ----------------------------------------
            Community Image
        ---------------------------------------- */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Community Image <Text style={styles.required}>*</Text>
          </Text>

          <Text style={styles.sectionDescription}>
            Upload an image that represents
            your community.
          </Text>

          <View style={styles.imageContainer}>
            {image ? (
              <>
                <Image
                  source={{ uri: image.uri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />

                <View style={styles.imageActions}>
                  <Pressable
                    style={styles.changeButton}
                    onPress={() =>
                      void pickImage()
                    }
                    disabled={saving}
                  >
                    <Text
                      style={styles.changeText}
                    >
                      Change
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.removeButton}
                    onPress={() =>
                      setImage(null)
                    }
                    disabled={saving}
                  >
                    <Text
                      style={styles.removeText}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable
                style={styles.uploadPlaceholder}
                onPress={() =>
                  void pickImage()
                }
                disabled={saving}
              >
                <Ionicons
                  name="image-outline"
                  size={38}
                  color="#4C7A45"
                />

                <Text style={styles.uploadTitle}>
                  Upload Community Photo
                </Text>

                <Text style={styles.uploadHint}>
                  Select and crop a photo
                  to 16:9
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ----------------------------------------
            Community Visibility
        ---------------------------------------- */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Community Visibility
          </Text>

          <Text style={styles.sectionDescription}>
            Choose who can join your community.
          </Text>

          {/* Public */}

          <Pressable
            style={[
              styles.visibilityCard,
              visibility === "public" &&
                styles.selectedCard,
            ]}
            onPress={() =>
              handleVisibilityChange("public")
            }
          >
            <Ionicons
              name={
                visibility === "public"
                  ? "radio-button-on"
                  : "radio-button-off"
              }
              size={22}
              color="#4C7A45"
            />

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                Public
              </Text>

              <Text style={styles.optionDescription}>
                Anyone can join immediately.
              </Text>
            </View>
          </Pressable>

          {/* Private */}

          <Pressable
            style={[
              styles.visibilityCard,
              visibility === "private" &&
                styles.selectedCard,
            ]}
            onPress={() =>
              handleVisibilityChange("private")
            }
          >
            <Ionicons
              name={
                visibility === "private"
                  ? "radio-button-on"
                  : "radio-button-off"
              }
              size={22}
              color="#4C7A45"
            />

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                Private
              </Text>

              <Text style={styles.optionDescription}>
                Control membership through
                invitations or join requests.
              </Text>
            </View>
          </Pressable>

          {/* ----------------------------------------
              Private Membership Options
          ---------------------------------------- */}

          {visibility === "private" && (
            <View style={styles.privateSettings}>
              <Text style={styles.privateTitle}>
                How can people join?
              </Text>

              {/* Invite Only */}

              <Pressable
                style={styles.privateOption}
                onPress={() =>
                  setPrivateAccess("invite")
                }
              >
                <Ionicons
                  name={
                    privateAccess === "invite"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color="#4C7A45"
                />

                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>
                    Invite Only
                  </Text>

                  <Text
                    style={styles.optionDescription}
                  >
                    Users need an invitation code
                    to join.
                  </Text>
                </View>
              </Pressable>

              {/* Request to Join */}

              <Pressable
                style={styles.privateOption}
                onPress={() =>
                  setPrivateAccess("request")
                }
              >
                <Ionicons
                  name={
                    privateAccess === "request"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color="#4C7A45"
                />

                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>
                    Request to Join
                  </Text>

                  <Text
                    style={styles.optionDescription}
                  >
                    Users can request membership.
                    The owner must approve requests.
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* ----------------------------------------
            Error
        ---------------------------------------- */}

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        {/* ----------------------------------------
            Form Actions
        ---------------------------------------- */}

        <View style={styles.actions}>
          {/* Cancel */}

          <Pressable
            style={styles.cancelButton}
            disabled={saving}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(
                  "/communities/my_communities"
                );
              }
            }}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </Pressable>

          {/* Save Draft */}

          <Pressable
            style={[
              styles.draftButton,
              (saving || loading) &&
                styles.disabledButton,
            ]}
            disabled={saving || loading}
            onPress={() =>
              void handleSave("drafted")
            }
          >
            <Text style={styles.draftText}>
              {savingAction === "drafted"
                ? "Saving..."
                : "Save as Draft"}
            </Text>
          </Pressable>

          {/* Publish */}

          <Pressable
            style={[
              styles.publishButton,
              (saving || loading) &&
                styles.disabledButton,
            ]}
            disabled={saving || loading}
            onPress={() =>
              void handleSave("publicActive")
            }
          >
            <Text style={styles.publishText}>
              {savingAction === "publicActive"
                ? "Publishing..."
                : "Publish Community"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================================================
// Styles
// ==================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7F3",
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 18,
    paddingBottom: 55,
    gap: 16,
  },

  eyebrow: {
    color: "#5D7C57",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  pageTitle: {
    color: "#1F2E22",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#63715F",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },

  field: {
    gap: 7,
  },

  label: {
    color: "#1F2E22",
    fontSize: 13,
    fontWeight: "700",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DDD4",
    borderRadius: 9,
    padding: 12,
    color: "#1F2E22",
    fontSize: 14,
  },

  descriptionInput: {
    minHeight: 110,
  },

  counter: {
    textAlign: "right",
    color: "#748071",
    fontSize: 11,
  },

  inputButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DDD4",
    borderRadius: 9,
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  inputButtonText: {
    color: "#1F2E22",
    fontSize: 14,
  },

  dropdown: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DDD4",
    borderRadius: 10,
    overflow: "hidden",
  },

  dropdownOption: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0EA",
  },

  dropdownText: {
    color: "#1F2E22",
    fontSize: 14,
  },

  section: {
    borderTopWidth: 1,
    borderTopColor: "#E6EBE3",
    paddingTop: 20,
    gap: 12,
  },

  sectionTitle: {
    color: "#1F2E22",
    fontSize: 19,
    fontWeight: "800",
  },

  sectionDescription: {
    color: "#63715F",
    fontSize: 13,
    lineHeight: 20,
  },

  imageContainer: {
    backgroundColor: "#F9FBF8",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CBD8C7",
    borderRadius: 14,
    overflow: "hidden",
  },

  imagePreview: {
    width: "100%",
    aspectRatio: 16 / 9,
  },

  uploadPlaceholder: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },

  uploadTitle: {
    color: "#2F6136",
    fontSize: 16,
    fontWeight: "800",
  },

  uploadHint: {
    color: "#748071",
    fontSize: 12,
  },

  imageActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    padding: 15,
  },

  changeButton: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: "#4C7A45",
  },

  changeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  removeButton: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DDD4",
  },

  removeText: {
    color: "#A33B32",
    fontSize: 13,
    fontWeight: "700",
  },

  visibilityCard: {
    flexDirection: "row",
    gap: 13,
    padding: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#DCE5D8",
    borderRadius: 12,
  },

  selectedCard: {
    borderColor: "#4C7A45",
    backgroundColor: "#F2F8EF",
  },

  optionContent: {
    flex: 1,
    gap: 5,
  },

  optionTitle: {
    color: "#1F2E22",
    fontSize: 14,
    fontWeight: "800",
  },

  optionDescription: {
    color: "#63715F",
    fontSize: 12,
    lineHeight: 19,
  },

  privateSettings: {
    marginTop: 4,
    padding: 15,
    backgroundColor: "#F9FBF8",
    borderWidth: 1,
    borderColor: "#DCE5D8",
    borderRadius: 12,
    gap: 13,
  },

  privateTitle: {
    color: "#1F2E22",
    fontSize: 15,
    fontWeight: "800",
  },

  privateOption: {
    flexDirection: "row",
    gap: 12,
    padding: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5D8",
    borderRadius: 10,
  },

  error: {
    color: "#B42318",
    fontSize: 13,
    backgroundColor: "#FFF3F1",
    padding: 14,
    borderRadius: 9,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 20,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#E6EBE3",
  },

  cancelButton: {
    flex: 1,
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFD6CB",
    borderRadius: 11,
  },

  cancelText: {
    color: "#425246",
    fontSize: 12,
    fontWeight: "700",
  },

  draftButton: {
    flex: 1.2,
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3E9DF",
    borderRadius: 11,
  },

  draftText: {
    color: "#315B35",
    fontSize: 12,
    fontWeight: "700",
  },

  publishButton: {
    flex: 1.4,
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#456D3F",
    borderRadius: 11,
  },

  publishText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  disabledButton: {
    opacity: 0.55,
  },

  required: {
    color: "#dc2626",
    fontWeight: "600",
    },
});