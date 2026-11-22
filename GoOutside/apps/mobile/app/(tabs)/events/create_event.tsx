
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

type MonthlyEventUsage = {
  packageName: string;
  used: number;
  limit: number;
    featuredUsed: number;
    featuredLimit: number;
  resetsAt: string;
};

async function getMonthlyEventUsage(userID: string): Promise<MonthlyEventUsage> {
  const { data: subscription, error: subscriptionError } = await supabase
    .from("UserPackage")
    .select("packageID, Package(packageName, eventMonthPostCount, featuredPosts)")
    .eq("userID", userID)
    .eq("active", true)
    .single();

  if (subscriptionError) throw new Error(subscriptionError.message);

  const packageData = Array.isArray(subscription.Package)
    ? subscription.Package[0]
    : subscription.Package;

  if (!packageData || !Number.isInteger(packageData.eventMonthPostCount)) {
    throw new Error("Unable to find your active package allowance.");
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const monthlyEvents = () => supabase
    .from("Event")
    .select("eventID", { count: "exact", head: true })
    .eq("userID", userID)
    .gte("createdDate", monthStart.toISOString())
    .lt("createdDate", nextMonth.toISOString());
  const [events, featuredEvents] = await Promise.all([
    monthlyEvents(), monthlyEvents().eq("isFeatured", true),
  ]);
  if (events.error) throw new Error(events.error.message);
  if (featuredEvents.error) throw new Error(featuredEvents.error.message);
  if (events.count === null || featuredEvents.count === null) throw new Error("Unable to verify event allowance.");

  return {
    packageName: packageData.packageName,
    used: events.count,
      featuredUsed: featuredEvents.count,
      featuredLimit: packageData.featuredPosts ?? 0,
    limit: packageData.eventMonthPostCount,
    resetsAt: nextMonth.toISOString(),
  };
}

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
  const [originalFeatured, setOriginalFeatured] = useState(false);
  const [draftCreatedDate, setDraftCreatedDate] = useState<string | null>(null);

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
  // Monthly Event Allowance
  // --------------------------------------------------

  const [eventUsage, setEventUsage] = useState<MonthlyEventUsage | null>(null);
  const [usageError, setUsageError] = useState("");
  const [usageLoading, setUsageLoading] = useState(false);

  const limitReached = eventUsage !== null && eventUsage.used >= eventUsage.limit;
  const creationBlocked = usageLoading || !eventUsage || limitReached;
  const nowForFeatured = new Date();
  const featuredMonthStart = Date.UTC(nowForFeatured.getUTCFullYear(), nowForFeatured.getUTCMonth(), 1);
  const featuredNextMonth = Date.UTC(nowForFeatured.getUTCFullYear(), nowForFeatured.getUTCMonth() + 1, 1);
  const draftInCurrentMonth = !isEditMode || (draftCreatedDate !== null &&
    Date.parse(draftCreatedDate) >= featuredMonthStart && Date.parse(draftCreatedDate) < featuredNextMonth);
  const canFeature = originalFeatured || (draftInCurrentMonth && eventUsage !== null && eventUsage.featuredUsed < eventUsage.featuredLimit);
  const featuredMessage = originalFeatured ? "This draft already has featured status."
    : !draftInCurrentMonth ? "Only drafts created this month can be newly featured."
    : !eventUsage ? "Unable to verify featured allowance."
    : !canFeature ? "Monthly featured post limit reached."
    : `${Math.max(0, eventUsage.featuredLimit - eventUsage.featuredUsed)} featured posts remaining`;


  async function refreshEventUsage() {
    setUsageLoading(true);
    setUsageError("");
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error(error?.message || "Sign in to continue.");
      setEventUsage(await getMonthlyEventUsage(user.id));
    } catch (error) {
      setEventUsage(null);
      setUsageError(error instanceof Error ? error.message : "Unable to load your event allowance.");
    } finally {
      setUsageLoading(false);
    }
  }

  // --------------------------------------------------
  // Load User / Categories / Existing Draft
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setEditLoaded(false);
      setOriginalFeatured(false);
      setDraftCreatedDate(null);
      setFeatured(false);
      setEventUsage(null);
      setUsageError("");

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

        setEventUsage(null);
        setUsageError("");

        {
          try {
            const usage = await getMonthlyEventUsage(user.id);
            if (!active) return;
            setEventUsage(usage);
          } catch (error) {
            if (!active) return;
            setUsageError(error instanceof Error ? error.message : "Unable to load your event allowance.");
          }
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
          setOriginalFeatured(Boolean(existing.isFeatured));
          setDraftCreatedDate(existing.createdDate);

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

    if (featured && !canFeature) {
      setError(featuredMessage);
      return;
    }


    if (!isEditMode && creationBlocked) {
      setError(limitReached
        ? "You have reached your monthly event limit."
        : "Unable to verify your monthly event allowance.");
      return;
    }

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

        {!isEditMode && (
          <View style={styles.allowanceCard}>
            <View style={styles.allowanceHeader}>
              <Text style={styles.allowanceTitle}>Monthly Event Allowance</Text>
              {eventUsage && <Text style={styles.packageBadge}>{eventUsage.packageName}</Text>}
            </View>

            {usageLoading ? (
              <ActivityIndicator color={green} />
            ) : eventUsage ? (
              <>
                <View style={styles.allowanceStats}>
                  <Text style={styles.allowanceDetail}>
                    <Text style={styles.allowanceCount}>{eventUsage.used} / {eventUsage.limit}</Text> events used
                  </Text>
                  <Text style={styles.allowanceDetail}>
                    Resets {new Date(eventUsage.resetsAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", timeZone: "UTC",
                    })} (UTC)
                  </Text>
                </View>
                <View style={styles.allowanceTrack} accessible accessibilityLabel={`${eventUsage.used} of ${eventUsage.limit} events used`}>
                  <View style={[styles.allowanceFill, {
                    width: `${eventUsage.limit > 0 ? Math.min(100, 100 * eventUsage.used / eventUsage.limit) : 100}%` as `${number}%`,
                  }]} />
                </View>
                {limitReached && (
                  <Text style={styles.allowanceWarning}>
                    You've reached your monthly limit. Upgrade your package or wait until next month to create more events.
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.allowanceWarning}>{usageError || "Unable to verify your allowance."}</Text>
            )}
            <Pressable disabled={saving || usageLoading} onPress={() => void refreshEventUsage()}>
              <Text style={styles.allowanceRetry}>Refresh allowance</Text>
            </Pressable>
          </View>
        )}

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

        {/* ----------------------------------------
            Featured Post
        ---------------------------------------- */}

        <Text style={styles.label}>
          Featured Post?
        </Text>

        <View style={styles.featureBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureDescription}>Mark this event as featured.</Text>
            {eventUsage && <Text style={styles.featureAllowance}>{eventUsage.featuredUsed} / {eventUsage.featuredLimit} featured posts used</Text>}
            <Text style={styles.featureAllowance}>{featuredMessage}</Text>
            {isEditMode && (
              <Pressable disabled={saving || usageLoading} onPress={() => void refreshEventUsage()}>
                <Text style={styles.allowanceRetry}>Refresh allowance</Text>
              </Pressable>
            )}
          </View>

          <Switch
            value={featured}
            onValueChange={setFeatured}
            disabled={saving || usageLoading || (!canFeature && !featured)}
            trackColor={{
              false: "#CDD3C9",
              true: green,
            }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Featured Post"
          />
        </View>

        {/* ----------------------------------------
            Event Photo
        ---------------------------------------- */}

        <Text style={styles.label}>
          Event Photo
        </Text>

        <View style={styles.photoArea}>
          {displayedPhotoURL ? (
            <>
              {/* Selected Image Preview */}

              <Image
                source={{
                  uri: displayedPhotoURL,
                }}
                style={styles.preview}
                resizeMode="contain"
              />

              {/* Image Details */}

              <Text style={styles.photoDetails}>
                {photo
                  ? `${(photo.size / 1048576).toFixed(2)} MB · Cropped 16:9`
                  : "Current event photo"}
              </Text>

              {/* Photo Action Buttons */}

              <View style={styles.photoActions}>
                {/* Change Photo */}

                <Pressable
                  style={[
                    styles.photoAction,
                    styles.changePhotoButton,
                  ]}
                  disabled={saving}
                  onPress={() => void pickImage()}
                  accessibilityRole="button"
                >
                  <Text style={styles.changePhotoText}>
                    Change Photo
                  </Text>
                </Pressable>

                {/* Crop Photo */}

                <Pressable
                  style={[
                    styles.photoAction,
                    styles.cropPhotoButton,
                    (saving || !originalPhoto) &&
                      styles.disabledPhotoButton,
                  ]}
                  disabled={saving || !originalPhoto}
                  onPress={() => {
                    if (originalPhoto) {
                      setPhotoToCrop(originalPhoto);
                    }
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.cropPhotoText}>
                    Crop
                  </Text>
                </Pressable>

                {/* Remove Photo */}

                <Pressable
                  style={[
                    styles.photoAction,
                    styles.removePhotoButton,
                  ]}
                  disabled={saving}
                  onPress={removePhoto}
                  accessibilityRole="button"
                >
                  <Text style={styles.removePhotoText}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* Empty Upload State */}

              <Text style={styles.uploadIcon}>
                +
              </Text>

              <Text style={styles.uploadTitle}>
                Upload an Event Photo
              </Text>

              <Text style={styles.uploadHelp}>
                JPG, PNG, or WebP. Maximum 5 MB.
              </Text>

              <Pressable
                style={[
                  styles.photoAction,
                  styles.changePhotoButton,
                ]}
                disabled={saving}
                onPress={() => void pickImage()}
                accessibilityRole="button"
              >
                <Text style={styles.changePhotoText}>
                  Choose Photo
                </Text>
              </Pressable>
            </>
          )}
        </View>

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

        <View style={[styles.row, styles.saveActions]}>
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
                  creationBlocked && styles.disabledSaveButton,
                ]}
                disabled={
                  saving || !!photoToCrop || creationBlocked
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
                  creationBlocked && styles.disabledSaveButton,
                ]}
                disabled={
                  saving || !!photoToCrop || creationBlocked
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
  allowanceCard: {
    backgroundColor: "#F7FAF7",
    borderColor: "#DCE7DF",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  allowanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  allowanceTitle: { fontSize: 14, fontWeight: "700", color: "#1F2E22", flexShrink: 1 },
  packageBadge: { backgroundColor: "#E3EEE6", color: "#28563B", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: "700" },
  allowanceStats: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 },
  allowanceDetail: { color: "#637568", fontSize: 12 },
  allowanceCount: { color: "#244B32", fontSize: 19, fontWeight: "700" },
  allowanceTrack: { height: 7, borderRadius: 20, overflow: "hidden", backgroundColor: "#E1E9E2" },
  allowanceFill: { height: "100%", borderRadius: 20, backgroundColor: "#438B61" },
  allowanceWarning: { color: "#9C5A27", fontSize: 12, lineHeight: 18, marginTop: 10 },
  allowanceRetry: { color: green, fontSize: 12, fontWeight: "700", marginTop: 12 },
  disabledSaveButton: { opacity: 0.45 },
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
  
    // --------------------------------------------------
    // Featured Post
    // --------------------------------------------------

    featureBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      minHeight: 62,
      paddingHorizontal: 16,
      paddingVertical: 10,

      backgroundColor: "#FAFBF8",
      borderWidth: 1,
      borderColor: "#D7DED2",
      borderRadius: 12,

      marginBottom: 0,
      gap: 12,
    },

    featureAllowance: { fontSize: 12, fontWeight: "600", color: "#63715F", marginTop: 4 },
    featureDescription: {
      color: "#63715F",
      fontSize: 14,
      lineHeight: 20,
    },

    // --------------------------------------------------
  // Event Photo Upload
  // --------------------------------------------------

  photoArea: {
    width: "100%",
    minHeight: 200,

    padding: 18,

    backgroundColor: "#FAFBF8",

    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CFD6CB",
    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 20,
  },

  // --------------------------------------------------
  // Image Preview
  // --------------------------------------------------

  preview: {
    width: "100%",
    aspectRatio: 16 / 9,

    borderRadius: 12,
    backgroundColor: "#EEF1EA",
  },

  // --------------------------------------------------
  // Image Details
  // --------------------------------------------------

  photoDetails: {
    marginTop: 12,
    marginBottom: 18,

    color: "#63715F",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  // --------------------------------------------------
  // Photo Action Container
  // --------------------------------------------------

  photoActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",

    width: "100%",
    gap: 8,
  },

  // --------------------------------------------------
  // Shared Photo Button Styling
  // --------------------------------------------------

  photoAction: {
    minHeight: 44,

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderWidth: 1,
    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center",
  },

  // --------------------------------------------------
  // Change Photo
  // --------------------------------------------------

  changePhotoButton: {
    backgroundColor: "#4C7A45",
    borderColor: "#4C7A45",
  },

  changePhotoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Crop Photo
  // --------------------------------------------------

  cropPhotoButton: {
    backgroundColor: "#E7F4F2",
    borderColor: "#8CC5BF",
  },

  cropPhotoText: {
    color: "#207E75",
    fontSize: 13,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Remove Photo
  // --------------------------------------------------

  removePhotoButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E0C9C5",
  },

  removePhotoText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "700",
  },

  saveActions: {
    marginTop: 8,
  },

  // --------------------------------------------------
  // Disabled Button
  // --------------------------------------------------

  disabledPhotoButton: {
    opacity: 0.5,
  },

  // --------------------------------------------------
  // Empty Upload State
  // --------------------------------------------------

  uploadIcon: {
    color: "#4C7A45",
    fontSize: 36,
    fontWeight: "400",
    marginBottom: 8,
  },

  uploadTitle: {
    color: "#1F2E22",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },

  uploadHelp: {
    color: "#63715F",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
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