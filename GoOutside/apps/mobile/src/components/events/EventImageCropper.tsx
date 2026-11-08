
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  ImageManipulator,
  SaveFormat,
} from "expo-image-manipulator";

// --------------------------------------------------
// Types
// --------------------------------------------------

type CropImage = {
  uri: string;
  width: number;
  height: number;
};

type CroppedImage = CropImage & {
  base64: string;
};

type Props = {
  image: CropImage;
  onApply: (image: CroppedImage) => void;
  onCancel: () => void;
};

type Position = {
  x: number;
  y: number;
};

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const ASPECT_RATIO = 16 / 9;
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;
const MAX_ZOOM = 3;

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    Math.max(value, minimum),
    maximum
  );
}

// --------------------------------------------------
// Image Cropper
// --------------------------------------------------

export default function EventImageCropper({
  image,
  onApply,
  onCancel,
}: Props) {
  const { width } = useWindowDimensions();

  const frameWidth = Math.max(
    1,
    Math.min(width - 48, 520)
  );

  const frameHeight =
    frameWidth / ASPECT_RATIO;

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [zoom, setZoom] = useState(1);

  const [position, setPosition] =
    useState<Position>({
      x: 0,
      y: 0,
    });

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // --------------------------------------------------
  // Image Dimensions
  // --------------------------------------------------

  const baseScale = Math.max(
    frameWidth / image.width,
    frameHeight / image.height
  );

  const scale = baseScale * zoom;

  const displayWidth =
    image.width * scale;

  const displayHeight =
    image.height * scale;

  const maxOffsetX = Math.max(
    0,
    (displayWidth - frameWidth) / 2
  );

  const maxOffsetY = Math.max(
    0,
    (displayHeight - frameHeight) / 2
  );

  // --------------------------------------------------
  // Gesture References
  // --------------------------------------------------

  const positionRef = useRef(position);
  const startPosition = useRef(position);

  const limitsRef = useRef({
    x: maxOffsetX,
    y: maxOffsetY,
  });

  limitsRef.current = {
    x: maxOffsetX,
    y: maxOffsetY,
  };

  function updatePosition(next: Position) {
    positionRef.current = next;
    setPosition(next);
  }

  // --------------------------------------------------
  // Reset When Image Changes
  // --------------------------------------------------

  useEffect(() => {
    setZoom(1);

    updatePosition({
      x: 0,
      y: 0,
    });

    setError("");
  }, [image.uri]);

  // --------------------------------------------------
  // Image Dragging
  // --------------------------------------------------

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          true,

        onMoveShouldSetPanResponder: () =>
          true,

        onPanResponderGrant: () => {
          startPosition.current = {
            ...positionRef.current,
          };
        },

        onPanResponderMove: (
          _event,
          gesture
        ) => {
          updatePosition({
            x: clamp(
              startPosition.current.x +
                gesture.dx,
              -limitsRef.current.x,
              limitsRef.current.x
            ),

            y: clamp(
              startPosition.current.y +
                gesture.dy,
              -limitsRef.current.y,
              limitsRef.current.y
            ),
          });
        },
      }),
    []
  );

  // --------------------------------------------------
  // Zoom
  // --------------------------------------------------

  function changeZoom(amount: number) {
    const nextZoom = clamp(
      zoom + amount,
      1,
      MAX_ZOOM
    );

    const nextScale =
      baseScale * nextZoom;

    const nextMaxX = Math.max(
      0,
      (
        image.width * nextScale -
        frameWidth
      ) / 2
    );

    const nextMaxY = Math.max(
      0,
      (
        image.height * nextScale -
        frameHeight
      ) / 2
    );

    updatePosition({
      x: clamp(
        position.x,
        -nextMaxX,
        nextMaxX
      ),

      y: clamp(
        position.y,
        -nextMaxY,
        nextMaxY
      ),
    });

    setZoom(nextZoom);
  }

  // --------------------------------------------------
  // Apply Crop
  // --------------------------------------------------

  async function handleApply() {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      if (
        image.width <= 0 ||
        image.height <= 0
      ) {
        throw new Error(
          "Invalid image dimensions."
        );
      }

      // Translate screen position to source pixels.

      const cropWidth =
        frameWidth / scale;

      const cropHeight =
        frameHeight / scale;

      const originX = clamp(
        (
          image.width - cropWidth
        ) / 2 - position.x / scale,
        0,
        image.width - cropWidth
      );

      const originY = clamp(
        (
          image.height - cropHeight
        ) / 2 - position.y / scale,
        0,
        image.height - cropHeight
      );

      // Crop original image.

      const context =
        ImageManipulator.manipulate(
          image.uri
        );

      context.crop({
        originX,
        originY,
        width: cropWidth,
        height: cropHeight,
      });

      // Resize to standard 16:9 output.

      context.resize({
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
      });

      const rendered =
        await context.renderAsync();

      // Save final cropped image.

      const result =
        await rendered.saveAsync({
          format: SaveFormat.JPEG,
          compress: 0.9,
          base64: true,
        });

      if (!result.base64) {
        throw new Error(
          "Unable to encode cropped photo."
        );
      }

      onApply({
        uri: result.uri,
        width: result.width,
        height: result.height,
        base64: result.base64,
      });
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Unable to crop photo."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!saving) {
          onCancel();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Title */}

          <Text style={styles.heading}>
            Crop Event Photo
          </Text>

          <Text style={styles.instructions}>
            Drag the image to reposition it.
            Use + and − to adjust zoom.
          </Text>

          {/* Crop Frame */}

          <View
            style={[
              styles.cropFrame,
              {
                width: frameWidth,
                height: frameHeight,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Image
              source={{
                uri: image.uri,
              }}
              resizeMode="stretch"
              style={{
                position: "absolute",
                width: displayWidth,
                height: displayHeight,
                left:
                  (
                    frameWidth - displayWidth
                  ) / 2 + position.x,
                top:
                  (
                    frameHeight - displayHeight
                  ) / 2 + position.y,
              }}
            />
          </View>

          {/* Zoom */}

          <View style={styles.zoomRow}>
            <Pressable
              style={styles.zoomButton}
              disabled={saving || zoom <= 1}
              onPress={() =>
                changeZoom(-0.2)
              }
            >
              <Text
                style={styles.zoomButtonText}
              >
                −
              </Text>
            </Pressable>

            <Text style={styles.zoomText}>
              {zoom.toFixed(1)}×
            </Text>

            <Pressable
              style={styles.zoomButton}
              disabled={
                saving || zoom >= MAX_ZOOM
              }
              onPress={() =>
                changeZoom(0.2)
              }
            >
              <Text
                style={styles.zoomButtonText}
              >
                +
              </Text>
            </Pressable>
          </View>

          {/* Errors */}

          {!!error && (
            <Text style={styles.error}>
              {error}
            </Text>
          )}

          {/* Actions */}

          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              disabled={saving}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={styles.applyButton}
              disabled={saving}
              onPress={() =>
                void handleApply()
              }
            >
              <Text style={styles.applyText}>
                {saving
                  ? "Cropping..."
                  : "Apply Crop"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 600,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    alignItems: "center",
  },
  heading: {
    color: "#1F2E22",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  instructions: {
    color: "#667085",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  cropFrame: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#202A23",
    borderWidth: 2,
    borderColor: "#31988F",
    borderRadius: 10,
  },
  zoomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginTop: 20,
  },
  zoomButton: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomButtonText: {
    fontSize: 24,
    color: "#207E75",
    fontWeight: "700",
  },
  zoomText: {
    minWidth: 54,
    textAlign: "center",
    color: "#1F2E22",
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 13,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#CFD6CB",
    alignItems: "center",
  },
  cancelText: {
    color: "#42516B",
    fontWeight: "700",
  },
  applyButton: {
    flex: 1,
    padding: 13,
    borderRadius: 9,
    backgroundColor: "#31988F",
    alignItems: "center",
  },
  applyText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  error: {
    color: "#B42318",
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
  },
});

