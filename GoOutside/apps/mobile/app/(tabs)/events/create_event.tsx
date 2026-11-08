
import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import * as ImagePicker from "expo-image-picker";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import EventImageCropper from "../../../src/components/events/EventImageCropper";

import AddressAutocomplete from "../../../src/components/events/AddressAutocomplete";

import {
  createEvent,
  getEventByID,
  getEventCategories,
  type EventImage,
} from "../../../src/services/events";

import {
  updateMobileEvent,
} from "../../../src/services/eventManagement";

import type {
  CategoryRecord,
} from "../../../src/types/event";

import {
  MAX_COST,
  MAX_DESCRIPTION,
  MAX_IMAGE_BYTES,
  MAX_TITLE,
  emptyDateTime,
  localDate,
  toISO,
  validateCost,
  type EventDateTime,
} from "../../../src/utils/eventValidation";

import { supabase } from "../../../src/lib/supabase";
import { theme } from "../../../src/constants/theme";

// --------------------------------------------------
// Constants
// --------------------------------------------------

const green = theme.colors.primary;

type PickerTarget =
  | "startDate"
  | "endDate"
  | "startTime"
  | "endTime";

// --------------------------------------------------
// Date Helpers
// --------------------------------------------------

function dateFromValue(
  value: EventDateTime
): Date {
  return new Date(
    toISO(value) ?? new Date().toISOString()
  );
}

function fromISO(
  value: string | null
): EventDateTime {
  if (!value) {
    return emptyDateTime();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return emptyDateTime();
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const hour = date.getHours();

  return {
    date: `${year}-${month}-${day}`,
    hour: String(hour % 12 || 12),
    minute: String(
      date.getMinutes()
    ).padStart(2, "0"),
    period: hour >= 12 ? "PM" : "AM",
  };
}

function updateTime(
  value: EventDateTime,
  selected: Date
): EventDateTime {
  const hour = selected.getHours();

  return {
    ...value,
    hour: String(hour % 12 || 12),
    minute: String(
      selected.getMinutes()
    ).padStart(2, "0"),
    period: hour >= 12 ? "PM" : "AM",
  };
}

function base64Size(value: string): number {
  const padding = value.endsWith("==")
    ? 2
    : value.endsWith("=")
      ? 1
      : 0;

  return (
    Math.floor(value.length * 3 / 4) -
    padding
  );
}

// --------------------------------------------------
// Create / Edit Event Screen
// --------------------------------------------------

export default function CreateEventScreen() {
  const router = useRouter();

  const { edit } = useLocalSearchParams<{
    edit?: string;
  }>();

  const editEventID =
    typeof edit === "string" && edit
      ? edit
      : null;

  const isEditMode = Boolean(editEventID);

  const returnPath = editEventID
    ? {
        pathname: "/events/[eventID]" as const,
        params: {
          eventID: editEventID,
          from: "my_events",
        },
      }
    : "/events/my_events" as const;

  // --------------------------------------------------
  // Form State
  // --------------------------------------------------

  const [title, setTitle] = useState("");
  const [categoryID, setCategoryID] =
    useState("");
  const [description, setDescription] =
    useState("");

  const [start, setStart] =
    useState<EventDateTime>(emptyDateTime);

  const [end, setEnd] =
    useState<EventDateTime>(emptyDateTime);

  const [location, setLocation] =
    useState("");

  const [cost, setCost] =
    useState("0");

  const [featured, setFeatured] =
    useState(false);

  // --------------------------------------------------
  // Photo State
  // --------------------------------------------------

  const [photo, setPhoto] =
    useState<EventImage | null>(null);

  const [originalPhoto, setOriginalPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(
      null
    );

  const [photoToCrop, setPhotoToCrop] =
    useState<ImagePicker.ImagePickerAsset | null>(
      null
    );

  const [existingImageURL, setExistingImageURL] =
    useState<string | null>(null);

  const [
    removeExistingImage,
    setRemoveExistingImage,
  ] = useState(false);

  const [editLoaded, setEditLoaded] =
    useState(false);

  const displayedPhotoURL =
    photo?.uri ??
    (removeExistingImage
      ? null
      : existingImageURL);

  // --------------------------------------------------
  // UI State
  // --------------------------------------------------

  const [categories, setCategories] =
    useState<CategoryRecord[]>([]);

  const [categoryOpen, setCategoryOpen] =
    useState(false);

  const [picker, setPicker] =
    useState<PickerTarget | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [signedIn, setSignedIn] =
    useState(false);

  const [error, setError] =
    useState("");

  // --------------------------------------------------
  // Load User / Categories / Existing Draft
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setEditLoaded(false);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!active) return;

        setSignedIn(Boolean(user));

        if (!user) {
          return;
        }

        const result =
          await getEventCategories();

        if (!active) return;

        setCategories(result);

        // Edit mode: load the draft.

        if (editEventID) {
          const existing =
            await getEventByID(editEventID);

          if (!existing) {
            throw new Error(
              "Event not found."
            );
          }

          if (existing.userID !== user.id) {
            throw new Error(
              "Only the event owner can edit this event."
            );
          }

          if (existing.status !== "drafted") {
            throw new Error(
              "Only draft events can be edited."
            );
          }

          if (!active) return;

          // Prepopulate all fields.

          setTitle(
            existing.eventTitle ?? ""
          );

          setCategoryID(
            existing.categoryID ?? ""
          );

          setDescription(
            existing.eventDescription ?? ""
          );

          setStart(
            fromISO(
              existing.eventStartTime
            )
          );

          setEnd(
            fromISO(
              existing.eventEndTime
            )
          );

          setLocation(
            existing.eventLocation ?? ""
          );

          setCost(
            String(existing.eventCost ?? 0)
          );

          setFeatured(
            Boolean(existing.isFeatured)
          );

          // Existing stored photo.

          setExistingImageURL(
            existing.eventImageURL ?? null
          );

          setPhoto(null);
          setOriginalPhoto(null);
          setPhotoToCrop(null);
          setRemoveExistingImage(false);

          setEditLoaded(true);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load event form."
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
  }, [editEventID]);

  // --------------------------------------------------
  // Select Photo
  // --------------------------------------------------

  async function pickImage() {
    if (saving || photoToCrop) {
      return;
    }

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 1,
          base64: true,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset) return;

      if (
        asset.mimeType !== "image/jpeg" &&
        asset.mimeType !== "image/png" &&
        asset.mimeType !== "image/webp"
      ) {
        setError(
          "Choose a JPG, PNG, or WebP photo."
        );
        return;
      }

      const size =
        asset.fileSize ??
        (asset.base64
          ? base64Size(asset.base64)
          : 0);

      if (
        size < 1 ||
        size > MAX_IMAGE_BYTES
      ) {
        setError(
          "Choose a photo no larger than 5 MB."
        );
        return;
      }

      if (
        !asset.width ||
        !asset.height
      ) {
        throw new Error(
          "Unable to read image dimensions."
        );
      }

      // Crop before accepting the photo.

      setPhotoToCrop(asset);
      setError("");
    } catch (pickError) {
      setError(
        pickError instanceof Error
          ? pickError.message
          : "Unable to select photo."
      );
    }
  }

  // --------------------------------------------------
  // Apply Cropped Photo
  // --------------------------------------------------

  function handleApplyCrop(cropped: {
    uri: string;
    width: number;
    height: number;
    base64: string;
  }) {
    if (!photoToCrop) return;

    const size = base64Size(
      cropped.base64
    );

    if (
      size < 1 ||
      size > MAX_IMAGE_BYTES
    ) {
      setError(
        "Cropped image must be no larger than 5 MB."
      );
      return;
    }

    // Keep the source for recropping.

    setOriginalPhoto(photoToCrop);

    // Upload the resulting JPEG.

    setPhoto({
      uri: cropped.uri,
      base64: cropped.base64,
      mimeType: "image/jpeg",
      size,
    });

    setRemoveExistingImage(false);
    setPhotoToCrop(null);
    setError("");
  }

  // --------------------------------------------------
  // Remove Photo
  // --------------------------------------------------

  function removePhoto() {
    if (saving) return;

    setPhoto(null);
    setOriginalPhoto(null);
    setPhotoToCrop(null);

    if (isEditMode) {
      setRemoveExistingImage(true);
    }

    setError("");
  }

  // --------------------------------------------------
  // Native Date / Time Picker
  // --------------------------------------------------

  function openPicker(target: PickerTarget) {
    setError("");

    if (Platform.OS === "android") {
      const isStart =
        target.startsWith("start");

      const isDate =
        target.endsWith("Date");

      const value = isStart
        ? dateFromValue(start)
        : dateFromValue(end);

      const currentValue =
        isDate && !isStart && !end.date
          ? start.date
            ? new Date(
                `${start.date}T12:00:00`
              )
            : new Date()
          : value;

      DateTimePickerAndroid.open({
        value: currentValue,
        mode: isDate ? "date" : "time",
        is24Hour: false,
        minimumDate: isDate
          ? target === "startDate"
            ? today
            : minEnd
          : undefined,
        onChange: (event, selected) => {
          if (
            event.type === "set" &&
            selected
          ) {
            applyPickerValue(
              target,
              selected
            );
          }
        },
      });

      return;
    }

    setPicker(target);
  }

  function applyPickerValue(
    target: PickerTarget,
    selected: Date
  ) {
    if (target === "startDate") {
      const date = localDate(selected);

      setStart((previous) => ({
        ...previous,
        date,
      }));

      // Default end date to start date.

      setEnd((previous) => ({
        ...previous,
        date,
      }));

      return;
    }

    if (target === "endDate") {
      const date = localDate(selected);

      if (
        date <
        (start.date || localDate())
      ) {
        setError(
          "End date cannot precede start date."
        );
        return;
      }

      setEnd((previous) => ({
        ...previous,
        date,
      }));

      return;
    }

    if (target === "startTime") {
      setStart((previous) =>
        updateTime(previous, selected)
      );
      return;
    }

    if (target === "endTime") {
      setEnd((previous) =>
        updateTime(previous, selected)
      );
    }
  }

  function onPickerChange(
    event: DateTimePickerEvent,
    selected?: Date
  ) {
    if (
      event.type !== "set" ||
      !selected ||
      !picker
    ) {
      return;
    }

    applyPickerValue(
      picker,
      selected
    );
  }

  // --------------------------------------------------
  // Save Draft / Publish / Edit
  // --------------------------------------------------

  async function save(
    status: "drafted" | "publicActive"
  ) {
    if (
      saving ||
      photoToCrop ||
      (isEditMode && !editLoaded)
    ) {
      return;
    }

    setError("");

    const cleanTitle = title.trim();
    const cleanDescription =
      description.trim();
    const cleanLocation = location.trim();

    // Cost validation.

    const costError = validateCost(cost);

    if (costError) {
      setError(costError);
      return;
    }

    // Length validation.

    if (
      cleanTitle.length > MAX_TITLE ||
      description.length > MAX_DESCRIPTION
    ) {
      setError(
        "Title or description is too long."
      );
      return;
    }

    // Date validation.

    const startISO = toISO(start);
    const endISO = toISO(end);
    const todayValue = localDate();

    if (
      (start.date && start.date < todayValue) ||
      (end.date && end.date < todayValue)
    ) {
      setError(
        "Past calendar dates are not allowed."
      );
      return;
    }

    if (
      (start.date && !startISO) ||
      (end.date && !endISO)
    ) {
      setError(
        "Enter valid dates and times."
      );
      return;
    }

    if (
      start.date &&
      end.date &&
      end.date < start.date
    ) {
      setError(
        "End date cannot precede start date."
      );
      return;
    }

    if (
      startISO &&
      endISO &&
      endISO <= startISO
    ) {
      setError(
        "End time must be later than start time."
      );
      return;
    }

    // Publishing requires complete fields.

    if (status === "publicActive") {
      if (
        !cleanTitle ||
        !categoryID ||
        !cleanDescription ||
        !startISO ||
        !endISO ||
        !cleanLocation ||
        !displayedPhotoURL
      ) {
        setError(
          "Complete all required fields and select a photo before publishing."
        );
        return;
      }

      const validCategory = categories.some(
        (category) =>
          category.categoryID === categoryID
      );

      if (!validCategory) {
        setError(
          "Select a valid category."
        );
        return;
      }

      if (
        new Date(startISO).getTime() <=
        Date.now()
      ) {
        setError(
          "Published events must start in the future."
        );
        return;
      }
    }

    // Save.

    setSaving(true);

    try {
      const input = {
        eventTitle: cleanTitle || null,
        categoryID: categoryID || null,
        eventDescription:
          cleanDescription || null,
        eventStartTime: startISO,
        eventEndTime: endISO,
        eventLocation: cleanLocation || null,
        eventCost: Number(cost.trim() || 0),
        isFeatured: featured,
        status,
      };

      if (editEventID) {
        if (status !== "drafted") {
          throw new Error(
            "Save changes, then publish from Event Details."
          );
        }

        // Update, never insert another event.

        await updateMobileEvent(
          editEventID,
          input,
          photo,
          removeExistingImage
        );

        router.replace(returnPath);
      } else {
        await createEvent(input, photo);

        router.replace(
          "/events/my_events"
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save event."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Display Helpers
  // --------------------------------------------------

  const displayDate = (value: string) =>
    value
      ? new Date(
          `${value}T12:00:00`
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Select date";

  const displayTime = (
    value: EventDateTime
  ) =>
    `${value.hour}:${value.minute} ${value.period}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minEnd = start.date
    ? new Date(
        `${start.date}T00:00:00`
      )
    : today;

  // --------------------------------------------------
  // Loading State
  // --------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          color={green}
          size="large"
        />
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // Signed-Out State
  // --------------------------------------------------

  if (!signedIn) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.heading}>
          Sign in to manage events
        </Text>

        <Pressable
          style={styles.primary}
          onPress={() =>
            router.push(
              "/Login_Sign_Up/login"
            )
          }
        >
          <Text style={styles.primaryText}>
            Log In
          </Text>
        </Pressable>

        {!!error && (
          <Text style={styles.error}>
            {error}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // Invalid / Unauthorized Edit
  // --------------------------------------------------

  if (isEditMode && !editLoaded) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.heading}>
          Unable to Edit Event
        </Text>

        <Text style={styles.error}>
          {error ||
            "Draft could not be loaded."}
        </Text>

        <Pressable
          onPress={() =>
            router.replace(
              "/events/my_events"
            )
          }
        >
          <Text style={styles.cancel}>
            Back to My Events
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // Form
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>
          EVENT MANAGEMENT
        </Text>

        <Text style={styles.heading}>
          {isEditMode
            ? "Edit Event"
            : "Create an Event"}
        </Text>

        <Text style={styles.help}>
          {isEditMode
            ? "Update your draft and save changes."
            : "Save a draft or publish when ready."}
        </Text>

        {/* Title */}

        <Text style={styles.label}>
          Event Title
        </Text>

        <TextInput
          style={styles.input}
          value={title}
          maxLength={MAX_TITLE}
          onChangeText={setTitle}
          placeholder="Enter event title"
          placeholderTextColor="#89938B"
          editable={!saving}
        />

        <Text style={styles.counter}>
          {title.length}/{MAX_TITLE}
        </Text>

        {/* Category */}

        <Text style={styles.label}>
          Category
        </Text>

        <Pressable
          style={styles.input}
          onPress={() =>
            setCategoryOpen(
              (previous) => !previous
            )
          }
        >
          <Text style={styles.inputText}>
            {categories.find(
              (item) =>
                item.categoryID === categoryID
            )?.categoryName ||
              "Select a category ▾"}
          </Text>
        </Pressable>

        {categoryOpen && (
          <View style={styles.options}>
            {categories.map((item) => (
              <Pressable
                key={item.categoryID}
                style={styles.option}
                onPress={() => {
                  setCategoryID(
                    item.categoryID
                  );
                  setCategoryOpen(false);
                }}
              >
                <Text style={styles.inputText}>
                  {item.categoryName}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Cost */}

        <Text style={styles.label}>
          Event Cost ($)
        </Text>

        <TextInput
          style={styles.input}
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#89938B"
          editable={!saving}
        />

        <Text style={styles.help}>
          Enter 0 for free. Maximum: $
          {MAX_COST.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </Text>

        {/* Description */}

        <Text style={styles.label}>
          Event Description
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.description,
          ]}
          multiline
          textAlignVertical="top"
          maxLength={MAX_DESCRIPTION}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your event..."
          placeholderTextColor="#89938B"
          editable={!saving}
        />

        <Text style={styles.counter}>
          {description.length}/{MAX_DESCRIPTION}
        </Text>

        {/* Dates */}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>
              Start Date
            </Text>

            <Pressable
              style={styles.input}
              onPress={() =>
                openPicker("startDate")
              }
            >
              <Text style={styles.inputText}>
                {displayDate(start.date)}
              </Text>
            </Pressable>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>
              End Date
            </Text>

            <Pressable
              style={styles.input}
              onPress={() =>
                openPicker("endDate")
              }
            >
              <Text style={styles.inputText}>
                {displayDate(end.date)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Times */}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>
              Start Time
            </Text>

            <Pressable
              style={styles.input}
              onPress={() =>
                openPicker("startTime")
              }
            >
              <Text style={styles.inputText}>
                {displayTime(start)}
              </Text>
            </Pressable>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>
              End Time
            </Text>

            <Pressable
              style={styles.input}
              onPress={() =>
                openPicker("endTime")
              }
            >
              <Text style={styles.inputText}>
                {displayTime(end)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Native Picker */}

        {picker && (
          <View style={styles.pickerPanel}>
            <DateTimePicker
              value={
                picker.startsWith("start")
                  ? dateFromValue(start)
                  : dateFromValue(end)
              }
              mode={
                picker.endsWith("Date")
                  ? "date"
                  : "time"
              }
              display={
                Platform.OS === "ios"
                  ? "spinner"
                  : "default"
              }
              minimumDate={
                picker === "startDate"
                  ? today
                  : picker === "endDate"
                    ? minEnd
                    : undefined
              }
              onChange={onPickerChange}
            />

            <Pressable
              style={styles.pickerDone}
              onPress={() =>
                setPicker(null)
              }
            >
              <Text style={styles.primaryText}>
                Done
              </Text>
            </Pressable>
          </View>
        )}

        {/* Location */}

        <Text style={styles.label}>
          Event Location
        </Text>

        <AddressAutocomplete
          value={location}
          onChangeText={setLocation}
          disabled={saving}
        />

        {/* Featured */}

        <View style={styles.switchRow}>
          <Text style={styles.label}>
            Featured Post?
          </Text>

          <Switch
            value={featured}
            onValueChange={setFeatured}
            disabled={saving}
            trackColor={{
              true: green,
            }}
          />
        </View>

        {/* Event Photo */}

        <Text style={styles.label}>
          Event Photo
        </Text>

        <Pressable
          style={styles.photoArea}
          disabled={saving}
          onPress={() =>
            void pickImage()
          }
        >
          {displayedPhotoURL ? (
            <>
              <Image
                source={{
                  uri: displayedPhotoURL,
                }}
                style={styles.preview}
                resizeMode="cover"
              />

              <Text style={styles.help}>
                {photo
                  ? `${(photo.size / 1048576).toFixed(2)} MB · Cropped 16:9`
                  : "Current event photo"}
              </Text>
            </>
          ) : (
            <Text style={styles.inputText}>
              + Choose Photo (JPG, PNG, or WebP)
            </Text>
          )}
        </Pressable>

        {!!displayedPhotoURL && (
          <View style={styles.photoActions}>
            <Pressable
              style={styles.photoAction}
              disabled={saving}
              onPress={() =>
                void pickImage()
              }
            >
              <Text style={styles.actionText}>
                Change
              </Text>
            </Pressable>

            <Pressable
              style={styles.photoAction}
              disabled={
                saving || !originalPhoto
              }
              onPress={() => {
                if (originalPhoto) {
                  setPhotoToCrop(originalPhoto);
                }
              }}
            >
              <Text style={styles.actionText}>
                Crop
              </Text>
            </Pressable>

            <Pressable
              style={styles.photoAction}
              disabled={saving}
              onPress={removePhoto}
            >
              <Text style={styles.remove}>
                Remove
              </Text>
            </Pressable>
          </View>
        )}

        {/* Error */}

        {!!error && (
          <Text
            accessibilityRole="alert"
            style={styles.error}
          >
            {error}
          </Text>
        )}

        {/* Save Buttons */}

        <View style={styles.row}>
          {isEditMode ? (
            <Pressable
              style={[
                styles.primary,
                styles.half,
              ]}
              disabled={
                saving || !!photoToCrop
              }
              onPress={() =>
                void save("drafted")
              }
            >
              <Text style={styles.primaryText}>
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={[
                  styles.draft,
                  styles.half,
                ]}
                disabled={
                  saving || !!photoToCrop
                }
                onPress={() =>
                  void save("drafted")
                }
              >
                <Text style={styles.draftText}>
                  {saving
                    ? "Saving..."
                    : "Save as Draft"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.primary,
                  styles.half,
                ]}
                disabled={
                  saving || !!photoToCrop
                }
                onPress={() =>
                  void save("publicActive")
                }
              >
                <Text style={styles.primaryText}>
                  {saving
                    ? "Saving..."
                    : "Publish Event"}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable
          disabled={saving}
          onPress={() =>
            router.replace(returnPath)
          }
        >
          <Text style={styles.cancel}>
            Cancel
          </Text>
        </Pressable>
      </ScrollView>

      {/* Image Cropper Modal */}

      {!!photoToCrop && (
        <EventImageCropper
          image={{
            uri: photoToCrop.uri,
            width: photoToCrop.width,
            height: photoToCrop.height,
          }}
          onApply={handleApplyCrop}
          onCancel={() =>
            setPhotoToCrop(null)
          }
        />
      )}
    </SafeAreaView>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F3",
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    backgroundColor: "#F6F7F3",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  eyebrow: {
    color: "#5D7C57",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heading: {
    color: "#1F2E22",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 12,
  },
  help: {
    color: "#63715F",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  label: {
    color: "#1F2E22",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFD6CB",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1F2E22",
    justifyContent: "center",
  },
  inputText: {
    color: "#1F2E22",
    fontSize: 15,
  },
  description: {
    minHeight: 150,
    paddingTop: 15,
  },
  counter: {
    fontSize: 12,
    color: "#758174",
    textAlign: "right",
    marginTop: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
  options: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CFD6CB",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  option: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EA",
  },
  pickerPanel: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  pickerDone: {
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: green,
  },
  switchRow: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photoArea: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CFD6CB",
    backgroundColor: "#FAFBF8",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: "#EEF1EA",
  },
  photoActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  photoAction: {
    borderWidth: 1,
    borderColor: "#B8C9B2",
    backgroundColor: "#E5EADF",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  actionText: {
    color: "#2F5B35",
    fontSize: 14,
    fontWeight: "700",
  },
  remove: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "700",
  },
  primary: {
    backgroundColor: green,
    borderRadius: 12,
    padding: 15,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  draft: {
    backgroundColor: "#E5EADF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#B8C9B2",
    padding: 15,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  draftText: {
    color: "#2F5B35",
    fontWeight: "700",
    fontSize: 14,
  },
  cancel: {
    color: green,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 24,
    padding: 10,
  },
  error: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 16,
  },
});
