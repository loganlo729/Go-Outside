
"use client";

import { useEffect } from "react";
import styles from "./LoginRequiredModal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
};

export default function LoginRequiredModal({
  open,
  onClose,
  onLogin,
}: Props) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        aria-describedby="login-required-message"
      >
        <h2
          id="login-required-title"
          className={styles.title}
        >
          Login Required
        </h2>

        <p
          id="login-required-message"
          className={styles.message}
        >
          You need to log in to RSVP to an event.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className={styles.loginButton}
            onClick={onLogin}
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
