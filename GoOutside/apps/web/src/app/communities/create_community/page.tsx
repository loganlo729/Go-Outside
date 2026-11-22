"use client";

// React
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

// Next.js
import Link from "next/link";
import { useRouter } from "next/navigation";

// Supabase
import { getSupabaseClient } from "../../../lib/supabase/client";

// Components
import ImageCropper from "../../../components/common/ImageCropper";
import LocationPicker from "../../../components/common/LocationPicker";

// Types
import type {
  LocationOption,
} from "../../../components/common/LocationPicker";

// Styles
import styles from "./CreateCommunity.module.css";

// ==================================================
// Constants
// ==================================================

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const COMMUNITY_IMAGE_BUCKET = "communities";

// ==================================================
// Types
// ==================================================

// --------------------------------------------------
// Category
// --------------------------------------------------

type CategoryOption = {
  categoryID: string;
  categoryName: string;
};

// --------------------------------------------------
// Community Visibility
// --------------------------------------------------

type Visibility = "public" | "private";

// --------------------------------------------------
// Private Access
// --------------------------------------------------

type PrivateAccess = "invite" | "request";

// --------------------------------------------------
// Save Action
// --------------------------------------------------

type SaveAction = "drafted" | "publicActive";

// ==================================================
// Component
// ==================================================

export default function CreateCommunityPage() {
  const router = useRouter();

  // ==================================================
  // Community Information
  // ==================================================

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [categoryID, setCategoryID] = useState("");

  // ==================================================
  // Location
  // ==================================================

  const [stateCode, setStateCode] = useState("");

  const [locationID, setLocationID] = useState<
    number | null
  >(null);

  const [locationName, setLocationName] = useState("");

  // ==================================================
  // Visibility
  // ==================================================

  const [visibility, setVisibility] =
    useState<Visibility>("public");

  const [privateAccess, setPrivateAccess] =
    useState<PrivateAccess>("invite");

  // ==================================================
  // Community Image
  // ==================================================

  const [photo, setPhoto] = useState<File | null>(null);

  const [photoToCrop, setPhotoToCrop] =
    useState<File | null>(null);

  const [photoPreview, setPhotoPreview] = useState("");

  // ==================================================
  // Categories
  // ==================================================

  const [categories, setCategories] = useState<
    CategoryOption[]
  >([]);

  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  // ==================================================
  // Page State
  // ==================================================

  const [loading, setLoading] = useState(true);

  const [savingAction, setSavingAction] =
    useState<SaveAction | null>(null);

  const [error, setError] = useState("");

  const saving = savingAction !== null;

  // ==================================================
  // Load User and Categories
  // ==================================================

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = getSupabaseClient();

      try {
        // ----------------------------------------
        // Authenticated User
        // ----------------------------------------

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error(
            "You must be signed in to create a community."
          );
        }

        // ----------------------------------------
        // Categories
        // ----------------------------------------

        const { data, error: categoryError } =
          await supabase
            .from("Category")
            .select("categoryID, categoryName")
            .order("categoryName");

        if (categoryError) {
          throw categoryError;
        }

        if (!active) return;

        setCategories(data ?? []);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load community creation form."
        );
      } finally {
        if (active) {
          setCategoriesLoading(false);
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
  // Community Image Preview
  // ==================================================

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }

    const url = URL.createObjectURL(photo);

    setPhotoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo]);

  // ==================================================
  // Image Handlers
  // ==================================================

  // --------------------------------------------------
  // Select Photo
  // --------------------------------------------------

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(
        "Community images must be 10 MB or smaller."
      );
      return;
    }

    setError("");
    setPhotoToCrop(file);
  }

  // --------------------------------------------------
  // Apply Crop
  // --------------------------------------------------

  function handleApplyCrop(croppedFile: File) {
    setPhoto(croppedFile);
    setPhotoToCrop(null);
    setError("");
  }

  // --------------------------------------------------
  // Remove Photo
  // --------------------------------------------------

  function handleRemovePhoto() {
    setPhoto(null);
    setPhotoToCrop(null);
  }

  // ==================================================
  // Location Handlers
  // ==================================================

  // --------------------------------------------------
  // Change State
  // --------------------------------------------------

  function handleStateChange(code: string) {
    setStateCode(code);

    setLocationID(null);
    setLocationName("");
  }

  // --------------------------------------------------
  // Select City
  // --------------------------------------------------

  function handleLocationSelect(
    location: LocationOption | null
  ) {
    setLocationID(location?.id ?? null);
    setLocationName(location?.name ?? "");
  }

  // ==================================================
  // Visibility Handlers
  // ==================================================

  function handleVisibilityChange(
    value: Visibility
  ) {
    setVisibility(value);

    if (value === "public") {
      setPrivateAccess("invite");
    }
  }

  // ==================================================
  // Save Community
  // ==================================================

  async function handleSave(action: SaveAction) {
    if (
      saving ||
      loading ||
      photoToCrop
    ) {
      return;
    }

    setError("");

    // --------------------------------------------------
    // Clean Values
    // --------------------------------------------------

    const cleanTitle = title.trim();

    const cleanDescription = description.trim();

    // --------------------------------------------------
    // Title Validation
    // --------------------------------------------------

    if (!cleanTitle) {
      setError("Community title is required.");
      return;
    }

    if (cleanTitle.length > MAX_TITLE_LENGTH) {
      setError(
        "Community title cannot exceed 150 characters."
      );
      return;
    }

    // --------------------------------------------------
    // Description Length Validation
    // --------------------------------------------------

    if (
      cleanDescription.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      setError(
        "Community description cannot exceed 2000 characters."
      );
      return;
    }

    // --------------------------------------------------
    // Publishing Validation
    // --------------------------------------------------

    if (action === "publicActive") {
      if (!categoryID) {
        setError("Please select a category.");
        return;
      }

      if (!cleanDescription) {
        setError(
          "Community description is required."
        );
        return;
      }

      if (!stateCode) {
        setError("Please select a state.");
        return;
      }
    }

    // --------------------------------------------------
    // Visibility Settings
    // --------------------------------------------------

    const isPublic = visibility === "public";

    const allowJoinRequests =
      !isPublic && privateAccess === "request";

    const allowInviteCodes =
      !isPublic && privateAccess === "invite";

    // --------------------------------------------------
    // Save
    // --------------------------------------------------

    setSavingAction(action);

    const supabase = getSupabaseClient();

    try {
      // ----------------------------------------
      // Authenticated User
      // ----------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You must be signed in to create a community."
        );
      }

      // ----------------------------------------
      // Generate Community ID
      // ----------------------------------------

      const communityID = crypto.randomUUID();

      // ----------------------------------------
      // Upload Community Image
      // ----------------------------------------

      let communityImageURL: string | null = null;

      let uploadedImagePath: string | null = null;

      if (photo) {
        const imagePath =
          `${user.id}/${communityID}/community.jpg`;

        const { error: uploadError } =
          await supabase.storage
            .from(COMMUNITY_IMAGE_BUCKET)
            .upload(imagePath, photo, {
              contentType: "image/jpeg",
              upsert: false,
            });

        if (uploadError) {
          throw uploadError;
        }

        uploadedImagePath = imagePath;

        const { data: publicURLData } =
          supabase.storage
            .from(COMMUNITY_IMAGE_BUCKET)
            .getPublicUrl(imagePath);

        communityImageURL =
          publicURLData.publicUrl;
      }

      // ----------------------------------------
      // Community Data
      // ----------------------------------------

      const communityData = {
        communityID,

        ownerID: user.id,

        communityTitle: cleanTitle,

        communityDescription:
          cleanDescription || null,

        categoryID: categoryID || null,

        stateCode: stateCode || null,

        locationID,

        communityImageURL,

        accessType: visibility,

        allowJoinRequests,

        allowInviteCodes,

        status: action,
      };

      // ----------------------------------------
      // Insert Community
      // ----------------------------------------

      const { error: createError } =
        await supabase
          .from("Community")
          .insert(communityData);

      if (createError) {
        // Remove an uploaded image when the
        // community insert fails.

        if (uploadedImagePath) {
          const { error: cleanupError } =
            await supabase.storage
              .from(COMMUNITY_IMAGE_BUCKET)
              .remove([uploadedImagePath]);

          if (cleanupError) {
            console.error(
              "Unable to remove orphaned image:",
              cleanupError
            );
          }
        }

        throw createError;
      }

      // ----------------------------------------
      // Redirect
      // ----------------------------------------

      router.replace(
        `/communities/${communityID}?from=my_communities`
      );

      router.refresh();
    } catch (err) {
        console.error("Community save failed:", err);

        let errorMessage = "Unable to save community.";

        if (
            err !== null &&
            typeof err === "object" &&
            "message" in err &&
            typeof err.message === "string"
        ) {
            errorMessage = err.message;
        }

        setError(errorMessage);
        } finally {
        setSavingAction(null);
        }
  }

  // ==================================================
  // Render
  // ==================================================

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* ========================================
            Page Header
        ======================================== */}

        <div className={styles.topRow}>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>
              GO OUTSIDE
            </p>

            <h1 className={styles.title}>
              Create a Community
            </h1>

            <p className={styles.subtitle}>
              Bring people together around shared
              interests, activities, and experiences.
            </p>
          </div>

          <Link
            href="/communities/my_communities"
            className={styles.backLink}
          >
            ← Back to Communities
          </Link>
        </div>

        {/* ========================================
            Community Form
        ======================================== */}

        <form
          className={styles.form}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            void handleSave("publicActive");
          }}
        >

          {/* ========================================
              Row 1: Title / Category
          ======================================== */}

          <div className={styles.twoColumns}>

            {/* Community Title */}

            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="communityTitle"
              >
                Community Title <span className={styles.required}>*</span>
              </label>

              <input
                id="communityTitle"
                className={styles.input}
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                maxLength={MAX_TITLE_LENGTH}
                placeholder="Enter community name"
              />

              <div className={styles.fieldFooter}>
                <span>
                  Name your community.
                </span>

                <span>
                  {title.length}/{MAX_TITLE_LENGTH}
                </span>
              </div>
            </div>

            {/* Category */}

            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="communityCategory"
              >
                Category <span className={styles.required}>*</span>
              </label>

              <select
                id="communityCategory"
                className={styles.select}
                value={categoryID}
                onChange={(event) =>
                  setCategoryID(event.target.value)
                }
                disabled={categoriesLoading}
              >
                <option value="">
                  {categoriesLoading
                    ? "Loading categories..."
                    : "Select a category"}
                </option>

                {categories.map((category) => (
                  <option
                    key={category.categoryID}
                    value={category.categoryID}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>

              <p className={styles.helpText}>
                Choose the best category.
              </p>
            </div>
          </div>

          {/* ========================================
              Community Description
          ======================================== */}

          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor="communityDescription"
            >
              Community Description <span className={styles.required}>*</span>
            </label>

            <textarea
              id="communityDescription"
              className={styles.textarea}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={4}
              placeholder="Describe your community, its purpose, and what members can expect..."
            />

            <div className={styles.fieldFooter}>
              <span>
                Tell people what your community is about.
              </span>

              <span>
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
          </div>

          {/* ========================================
              Community Location
          ======================================== */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Community Location
              </h2>

              <p className={styles.sectionDescription}>
                Select a state. City or town is optional
                for statewide communities.
              </p>
            </div>

            <div className={styles.locationContainer}>
              <LocationPicker
                idPrefix="community"
                stateCode={stateCode}
                locationId={locationID}
                locationName={locationName}
                onStateChange={handleStateChange}
                onSelect={handleLocationSelect}
              />
            </div>
          </section>

          {/* ========================================
              Community Image
          ======================================== */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Community Image <span className={styles.required}>*</span>
              </h2>

              <p className={styles.sectionDescription}>
                Upload an image that represents your
                community. Images are cropped to 16:9.
              </p>
            </div>

            <div className={styles.uploadBox}>
              {photoPreview ? (

                // ------------------------------------
                // Image Preview
                // ------------------------------------

                <div className={styles.imagePreview}>
                  <img
                    src={photoPreview}
                    alt="Community image preview"
                    className={styles.previewImage}
                  />

                  <div className={styles.imageActions}>
                    <label
                      className={styles.changeImageButton}
                    >
                      Change Photo

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        disabled={saving}
                        className={styles.hiddenInput}
                      />
                    </label>

                    <button
                      type="button"
                      className={styles.removeImageButton}
                      onClick={handleRemovePhoto}
                      disabled={saving}
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (

                // ------------------------------------
                // Upload Placeholder
                // ------------------------------------

                <label className={styles.uploadLabel}>
                  <span className={styles.uploadIcon}>
                    +
                  </span>

                  <strong>
                    Upload Community Photo
                  </strong>

                  <span>
                    Select an image to upload and crop
                  </span>

                  <small>
                    Maximum 10 MB • 16:9 image
                  </small>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={saving}
                    className={styles.hiddenInput}
                  />
                </label>
              )}
            </div>
          </section>

          {/* ========================================
              Community Visibility
          ======================================== */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Community Visibility
              </h2>

              <p className={styles.sectionDescription}>
                Choose how people can join your community.
              </p>
            </div>

            {/* ------------------------------------
                Visibility Options
            ------------------------------------ */}

            <div className={styles.visibilityOptions}>

              {/* Public */}

              <label
                className={`${styles.optionCard} ${
                  visibility === "public"
                    ? styles.optionCardSelected
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="communityVisibility"
                  value="public"
                  checked={visibility === "public"}
                  onChange={() =>
                    handleVisibilityChange("public")
                  }
                />

                <div>
                  <strong>Public</strong>

                  <p>
                    Anyone can join your community immediately.
                  </p>
                </div>
              </label>

              {/* Private */}

              <label
                className={`${styles.optionCard} ${
                  visibility === "private"
                    ? styles.optionCardSelected
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="communityVisibility"
                  value="private"
                  checked={visibility === "private"}
                  onChange={() =>
                    handleVisibilityChange("private")
                  }
                />

                <div>
                  <strong>Private</strong>

                  <p>
                    Control membership through invitations or join requests.
                  </p>
                </div>
              </label>
            </div>

            {/* ------------------------------------
                Private Access Settings
            ------------------------------------ */}

            {visibility === "private" && (
              <div className={styles.privateSettings}>
                <h3>
                  How can people join?
                </h3>

                <div className={styles.privateOptions}>

                  {/* Invite Only */}

                  <label
                    className={styles.radioOption}
                  >
                    <input
                      type="radio"
                      name="privateAccess"
                      value="invite"
                      checked={
                        privateAccess === "invite"
                      }
                      onChange={() =>
                        setPrivateAccess("invite")
                      }
                    />

                    <div>
                      <strong>
                        Invite Only
                      </strong>

                      <p>
                        Users need a valid invitation code to join.
                      </p>
                    </div>
                  </label>

                  {/* Request to Join */}

                  <label
                    className={styles.radioOption}
                  >
                    <input
                      type="radio"
                      name="privateAccess"
                      value="request"
                      checked={
                        privateAccess === "request"
                      }
                      onChange={() =>
                        setPrivateAccess("request")
                      }
                    />

                    <div>
                      <strong>
                        Request to Join
                      </strong>

                      <p>
                        Users can request access. The community owner must approve membership requests.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* ========================================
              Error Message
          ======================================== */}

          {error && (
            <div
              className={styles.error}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* ========================================
              Form Actions
          ======================================== */}

          <div className={styles.actions}>

            {/* Cancel */}

            <Link
              href="/communities/my_communities"
              className={styles.cancelButton}
              aria-disabled={saving}
              onClick={(event) => {
                if (saving) {
                  event.preventDefault();
                }
              }}
            >
              Cancel
            </Link>

            {/* Save as Draft */}

            <button
              type="button"
              className={styles.draftButton}
              disabled={
                loading ||
                saving ||
                !!photoToCrop
              }
              onClick={() =>
                void handleSave("drafted")
              }
            >
              {savingAction === "drafted"
                ? "Saving Draft..."
                : "Save as Draft"}
            </button>

            {/* Publish Community */}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                loading ||
                saving ||
                !!photoToCrop
              }
            >
              {savingAction === "publicActive"
                ? "Publishing..."
                : "Publish Community"}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================
          Community Image Cropper
      ======================================== */}

      {photoToCrop && (
        <ImageCropper
          file={photoToCrop}
          onApply={handleApplyCrop}
          onCancel={() =>
            setPhotoToCrop(null)
          }
        />
      )}
    </main>
  );
}