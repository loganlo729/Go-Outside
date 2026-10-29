
"use client";

import { useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

type Props = {
  userId: string;
  onUploaded: (path: string) => void;
};

export default function BannerUpload({
  userId,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Banner images must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const supabase = getSupabaseClient();

      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

      const filePath =
        `${userId}/banner-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error: updateError } = await supabase
        .from("Profile")
        .update({ bannerPath: filePath })
        .eq("userID", userId)
        .select("bannerPath")
        .single();

      if (updateError) throw updateError;

      onUploaded(data.bannerPath);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload banner."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button
        type="button"
        className="account-btn outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading..." : "Change Cover"}
      </button>

      {error && <p className="auth-error">{error}</p>}
    </>
  );
}
