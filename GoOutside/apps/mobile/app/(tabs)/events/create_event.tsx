
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

import AddressAutocomplete from "../../../src/components/events/AddressAutocomplete";

import {
  createEvent,
  getEventCategories,
  type EventImage,
} from "../../../src/services/events";

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
// Constants and Types
// --------------------------------------------------

const green = theme.colors.primary;

type PickerTarget =
  | "startDate"
  | "endDate"
  | "startTime"
  | "endTime";

// --------------------------------------------------
// Date and Time Helpers
// --------------------------------------------------

function dateFromValue(value: EventDateTime) {
  return new Date(
    toISO(value) ?? new Date().toISOString()
  );
}

function updateTime(
  value: EventDateTime,
  selected: Date
): EventDateTime {
  const hour = selected.getHours();

  return {
    ...value,
    hour: String((hour % 12) || 12),
    minute: String(selected.getMinutes()).padStart(2, "0"),
    period: hour >= 12 ? "PM" : "AM",
  };
}

// --------------------------------------------------
// Create Event Screen
// --------------------------------------------------

export default function CreateEventScreen() {
  const router = useRouter();

  // --------------------------------------------------
  // Form State
  // --------------------------------------------------

  const [title, setTitle] = useState("");
  const [categoryID, setCategoryID] = useState("");
  const [description, setDescription] = useState("");

  const [start, setStart] = useState<EventDateTime>(
    emptyDateTime
  );

  const [end, setEnd] = useState<EventDateTime>(
    emptyDateTime
  );

  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("0");
  const [featured, setFeatured] = useState(false);

  const [photo, setPhoto] = useState<EventImage | null>(
    null
  );

  // --------------------------------------------------
  // UI State
  // --------------------------------------------------

  const [categories, setCategories] = useState<
    CategoryRecord[]
  >([]);

  const [categoryOpen, setCategoryOpen] = useState(false);

  const [picker, setPicker] = useState<
    PickerTarget | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load User and Categories
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (active) {
          setSignedIn(!!user);
        }

        if (user) {
          const result = await getEventCategories();

          if (active) {
            setCategories(result);
          }
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load form"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // Select Event Photo
  // --------------------------------------------------

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const mime = asset.mimeType;

    if (
      mime !== "image/jpeg" &&
      mime !== "image/png" &&
      mime !== "image/webp"
    ) {
      setError("Choose a JPG, PNG, or WebP photo.");
      return;
    }

    if (!asset.base64) {
      setError(
        "Unable to read this photo. Choose another image."
      );
      return;
    }

    const estimatedSize =
      asset.fileSize ??
      Math.floor((asset.base64.length * 3) / 4);

    if (
      estimatedSize < 1 ||
      estimatedSize > MAX_IMAGE_BYTES
    ) {
      setError("Choose a photo no larger than 5 MB.");
      return;
    }

    setPhoto({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: mime,
      size: estimatedSize,
    });

    setError("");
  }

  // --------------------------------------------------
  // Handle Native Date / Time Picker
  // --------------------------------------------------

  function onPickerChange(
    event: DateTimePickerEvent,
    selected?: Date
  ) {
    if (Platform.OS === "android") {
      setPicker(null);
    }

    if (
      event.type !== "set" ||
      !selected ||
      !picker
    ) {
      return;
    }

    if (picker === "startDate") {
      const date = localDate(selected);

      setStart((previous) => ({
        ...previous,
        date,
      }));

      setEnd((previous) => ({
        ...previous,
        date,
      }));
    } else if (picker === "endDate") {
      const date = localDate(selected);

      if (date < (start.date || localDate())) {
        setError(
          "End date cannot precede start date."
        );
        return;
      }

      setEnd((previous) => ({
        ...previous,
        date,
      }));
    } else if (picker === "startTime") {
      setStart((previous) =>
        updateTime(previous, selected)
      );
    } else {
      setEnd((previous) =>
        updateTime(previous, selected)
      );
    }
  }

  // --------------------------------------------------
  // Save Draft / Publish Event
  // --------------------------------------------------

  async function save(
    status: "drafted" | "publicActive"
  ) {
    if (saving) {
      return;
    }

    setError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanLocation = location.trim();

    // Validate cost

    const costError = validateCost(cost);

    if (costError) {
      setError(costError);
      return;
    }

    // Validate text limits

    if (
      cleanTitle.length > MAX_TITLE ||
      description.length > MAX_DESCRIPTION
    ) {
      setError("Title or description is too long.");
      return;
    }

    // Validate dates and times

    const startISO = toISO(start);
    const endISO = toISO(end);
    const today = localDate();

    if (
      (start.date && start.date < today) ||
      (end.date && end.date < today)
    ) {
      setError("Past calendar dates are not allowed.");
      return;
    }

    if (
      (start.date && !startISO) ||
      (end.date && !endISO)
    ) {
      setError("Enter valid dates and times.");
      return;
    }

    if (
      start.date &&
      end.date &&
      end.date < start.date
    ) {
      setError("End date cannot precede start date.");
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

    // Additional publishing requirements

    if (status === "publicActive") {
      if (
        !cleanTitle ||
        !categoryID ||
        !cleanDescription ||
        !startISO ||
        !endISO ||
        !cleanLocation ||
        !photo
      ) {
        setError(
          "Complete every field and select a photo before publishing."
        );
        return;
      }

      const validCategory = categories.some(
        (category) =>
          category.categoryID === categoryID
      );

      if (!validCategory) {
        setError("Select a valid category.");
        return;
      }

      if (
        new Date(startISO).getTime() < Date.now()
      ) {
        setError(
          "Published events cannot start in the past."
        );
        return;
      }
    }

    // Save to Supabase

    setSaving(true);

    try {
      await createEvent(
        {
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
        },
        photo
      );

      router.replace("/events/my_events");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
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

  const displayTime = (value: EventDateTime) =>
    `${value.hour}:${value.minute} ${value.period}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minEnd = start.date
    ? new Date(`${start.date}T00:00:00`)
    : today;

  // --------------------------------------------------
  // Loading State
  // --------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={green} />
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
          Sign in to create an event
        </Text>

        <Pressable
          style={styles.primary}
          onPress={() =>
            router.push("/Login_Sign_Up/login")
          }
        >
          <Text style={styles.primaryText}>
            Log in
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
  // Main Form
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}

        <Text style={styles.eyebrow}>
          EVENT MANAGEMENT
        </Text>

        <Text style={styles.heading}>
          Create an Event
        </Text>

        <Text style={styles.help}>
          Save a draft or publish when ready.
        </Text>

        {/* Event Title */}

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
            setCategoryOpen((previous) => !previous)
          }
        >
          <Text style={styles.inputText}>
            {categories.find(
              (category) =>
                category.categoryID === categoryID
            )?.categoryName ||
              "Select a category ▾"}
          </Text>
        </Pressable>

        {categoryOpen && (
          <View style={styles.options}>
            {categories.map((category) => (
              <Pressable
                key={category.categoryID}
                style={styles.option}
                onPress={() => {
                  setCategoryID(category.categoryID);
                  setCategoryOpen(false);
                }}
              >
                <Text style={styles.inputText}>
                  {category.categoryName}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Event Cost */}

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
        />

        <Text style={styles.help}>
          $0–$
          {MAX_COST.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </Text>

        {/* Event Description */}

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
        />

        <Text style={styles.counter}>
          {description.length}/{MAX_DESCRIPTION}
        </Text>

        {/* Start and End Dates */}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>
              Start Date
            </Text>

            <Pressable
              style={styles.input}
              onPress={() =>
                setPicker("startDate")
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
                setPicker("endDate")
              }
            >
              <Text style={styles.inputText}>
                {displayDate(end.date)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Start and End Times */}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>
              Start Time
            </Text>

            <Pressable
              style={styles.input}
              onPress={() =>
                setPicker("startTime")
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
                setPicker("endTime")
              }
            >
              <Text style={styles.inputText}>
                {displayTime(end)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Native Date / Time Picker */}

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

            {Platform.OS === "ios" && (
              <Pressable
                style={styles.pickerDone}
                onPress={() => setPicker(null)}
              >
                <Text style={styles.primaryText}>
                  Done
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Event Location */}

        <Text style={styles.label}>
          Event Location
        </Text>

        <AddressAutocomplete
          value={location}
          onChangeText={setLocation}
          disabled={saving}
        />

        {/* Featured Post */}

        <View style={styles.switchRow}>
          <Text style={styles.label}>
            Featured Post?
          </Text>

          <Switch
            value={featured}
            onValueChange={setFeatured}
            trackColor={{
              true: green,
            }}
            disabled={saving}
          />
        </View>

        {/* Event Photo */}

        <Text style={styles.label}>
          Event Photo
        </Text>

        <Pressable
          style={styles.photoArea}
          onPress={() => void pickImage()}
          disabled={saving}
        >
          {photo ? (
            <>
              <Image
                source={{ uri: photo.uri }}
                style={styles.preview}
                resizeMode="contain"
              />

              <Text style={styles.help}>
                Change photo ·{" "}
                {(photo.size / 1048576).toFixed(2)} MB
              </Text>
            </>
          ) : (
            <Text style={styles.inputText}>
              + Choose Photo (JPG, PNG or WebP, up to 5 MB)
            </Text>
          )}
        </Pressable>

        {photo && (
          <Pressable
            onPress={() => setPhoto(null)}
            disabled={saving}
          >
            <Text style={styles.remove}>
              Remove photo
            </Text>
          </Pressable>
        )}

        {/* Validation / Submission Errors */}

        {!!error && (
          <Text
            accessibilityRole="alert"
            style={styles.error}
          >
            {error}
          </Text>
        )}

        {/* Form Actions */}

        <View style={styles.row}>
          <Pressable
            style={[
              styles.draft,
              styles.half,
            ]}
            disabled={saving}
            onPress={() => void save("drafted")}
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
            disabled={saving}
            onPress={() => void save("publicActive")}
          >
            <Text style={styles.primaryText}>
              {saving
                ? "Saving..."
                : "Publish Event"}
            </Text>
          </Pressable>
        </View>

        {/* Cancel */}

        <Pressable
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancel}>
            Cancel
          </Text>
        </Pressable>
      </ScrollView>
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  content: {
    padding: 22,
    paddingBottom: 65,
    gap: 10,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#5D7C57",
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1F2E22",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2E22",
    marginTop: 10,
  },

  help: {
    fontSize: 12,
    color: "#63715F",
  },

  counter: {
    fontSize: 12,
    color: "#63715F",
    textAlign: "right",
  },

  input: {
    minHeight: 52,
    borderColor: "#CFD6CB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#FFF",
    fontSize: 16,
    color: "#1F2E22",
  },

  inputText: {
    color: "#1F2E22",
    fontSize: 15,
  },

  description: {
    minHeight: 135,
    paddingTop: 13,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },

  half: {
    flex: 1,
    minWidth: 0,
  },

  options: {
    borderWidth: 1,
    borderColor: "#CFD6CB",
    borderRadius: 12,
    backgroundColor: "#FFF",
  },

  option: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEDEA",
  },

  pickerPanel: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
  },

  pickerDone: {
    backgroundColor: green,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFD6CB",
    marginTop: 12,
  },

  photoArea: {
    borderWidth: 2,
    borderColor: "#CFD6CB",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFBF8",
    minHeight: 110,
  },

  preview: {
    width: "100%",
    height: 190,
  },

  remove: {
    color: "#B42318",
    alignSelf: "center",
    marginTop: 7,
  },

  error: {
    color: "#B42318",
    marginTop: 10,
  },

  draft: {
    backgroundColor: "#E5EADF",
    borderRadius: 11,
    padding: 15,
    alignItems: "center",
  },

  draftText: {
    color: "#2F5B35",
    fontWeight: "700",
  },

  primary: {
    backgroundColor: green,
    borderRadius: 11,
    padding: 15,
    alignItems: "center",
  },

  primaryText: {
    color: "#FFF",
    fontWeight: "700",
  },

  cancel: {
    color: "#63715F",
    textAlign: "center",
    marginTop: 12,
  },
});
