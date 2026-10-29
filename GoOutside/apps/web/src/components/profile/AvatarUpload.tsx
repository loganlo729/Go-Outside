
"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

type AvatarUploadProps = {
  userId: string;
  initialPath: string | null;
  displayName: string;
};

export default function AvatarUpload({
  userId,
  initialPath,
  displayName,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [avatarPath, setAvatarPath] = useState(initialPath);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAvatarPath(initialPath);
  }, [initialPath]);

  const supabase = getSupabaseClient();

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
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile pictures must be smaller than 5 MB.");
      return;
    }

    setUploading(true);

    try {
      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

      // Unique filenames avoid stale image caches.
      const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: profile, error: updateError } =
        await supabase
          .from("Profile")
          .update({
            profilePicturePath: filePath,
          })
          .eq("userID", userId)
          .select("profilePicturePath")
          .single();

      if (updateError) throw updateError;

      setAvatarPath(profile.profilePicturePath);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload profile picture."
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <button
        type="button"
        className="account-avatar account-avatar-editable"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        aria-label="Change profile picture"
        title="Change profile picture"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={`${displayName}'s avatar`}
            className="account-avatar-image"
          />
        ) : (
          <span className="account-avatar-initials">
            {initials}
          </span>
        )}

        <span className="account-avatar-overlay">
          {uploading ? (
            <span className="account-avatar-loading">...</span>
          ) : (
            <img
              src="/pencil.svg"
              alt=""
              width={50}
              height={50}
              className="account-avatar-pencil"
            />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {error && <p className="auth-error">{error}</p>}
    </>
  );
}