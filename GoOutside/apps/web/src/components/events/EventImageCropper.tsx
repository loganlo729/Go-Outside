
"use client";

// React hooks
import {
  useCallback,
  useEffect,
  useState,
} from "react";

// Image cropping
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

// Component styles
import styles from "./EventImageCropper.module.css";

// --------------------------------------------------
// Props
// --------------------------------------------------

type Props = {
  file: File;
  onApply: (file: File) => void;
  onCancel: () => void;
};

// --------------------------------------------------
// Crop Image to File
// --------------------------------------------------

async function cropImage(
  imageURL: string,
  area: Area,
  filename: string
): Promise<File> {
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Unable to load the image."));

    image.src = imageURL;
  });

  const canvas = document.createElement("canvas");

  // Export in a consistent 16:9 format.
  canvas.width = 1280;
  canvas.height = 720;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image cropping is not supported.");
  }

  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(
            new Error("Unable to generate cropped image.")
          );
        }
      },
      "image/jpeg",
      0.9
    );
  });

  const name = filename.replace(/\.[^.]+$/, "");

  return new File(
    [blob],
    `${name}-cropped.jpg`,
    {
      type: "image/jpeg",
      lastModified: Date.now(),
    }
  );
}

// --------------------------------------------------
// Event Image Cropper
// --------------------------------------------------

export default function EventImageCropper({
  file,
  onApply,
  onCancel,
}: Props) {
  const [imageURL, setImageURL] = useState("");

  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<Area | null>(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load Selected Image
  // --------------------------------------------------

  useEffect(() => {
    const url = URL.createObjectURL(file);

    setImageURL(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // --------------------------------------------------
  // Track Crop Area
  // --------------------------------------------------

  const onCropComplete = useCallback(
    (_: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  // --------------------------------------------------
  // Apply Crop
  // --------------------------------------------------

  async function handleApply() {
    if (
      !imageURL ||
      !croppedAreaPixels ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const result = await cropImage(
        imageURL,
        croppedAreaPixels,
        file.name
      );

      onApply(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to crop image."
      );
    } finally {
      setProcessing(false);
    }
  }

  // --------------------------------------------------
  // Escape Key
  // --------------------------------------------------

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !processing) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel, processing]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        {/* Header */}

        <div className={styles.header}>
          <h2 id="crop-title">
            Crop Event Photo
          </h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onCancel}
            disabled={processing}
            aria-label="Close image cropper"
          >
            ×
          </button>
        </div>

        {/* Instructions */}

        <p className={styles.instructions}>
          Drag your image to reposition it.
          Use the slider to zoom.
          The image will be cropped to 16:9.
        </p>

        {/* Crop Area */}

        <div className={styles.cropContainer}>
          {imageURL && (
            <Cropper
              image={imageURL}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        {/* Zoom Controls */}

        <div className={styles.zoomRow}>
          <label htmlFor="eventPhotoZoom">
            Zoom
          </label>

          <input
            id="eventPhotoZoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) =>
              setZoom(Number(event.target.value))
            }
            className={styles.zoomSlider}
          />

          <span>{zoom.toFixed(1)}×</span>
        </div>

        {/* Error */}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {/* Actions */}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </button>

          <button
            type="button"
            className={styles.applyButton}
            onClick={() => void handleApply()}
            disabled={
              processing ||
              !imageURL ||
              !croppedAreaPixels
            }
          >
            {processing
              ? "Cropping..."
              : "Apply Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
