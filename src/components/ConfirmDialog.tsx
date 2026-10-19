"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  triggerRef,
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Cache the active trigger element
    lastActiveElementRef.current =
      triggerRef?.current || (document.activeElement as HTMLElement | null);

    // Focus moves into the dialog on open (focus Cancel button to prevent accidental confirmation)
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      // Return focus to trigger element on close
      lastActiveElementRef.current?.focus();
    };
  }, [isOpen, onCancel, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="modal"
        style={{
          maxWidth: "440px",
          width: "92%",
          padding: "1.75rem",
          margin: "0 auto",
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
          <div className="flex items-center gap-3">
            <div
              className={`icon-chip ${variant === "danger" ? "icon-chip-coral" : "icon-chip-yellow"}`}
              style={{ width: "36px", height: "36px" }}
            >
              <AlertTriangle size={18} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </div>
            <h2
              id="confirm-dialog-title"
              style={{
                fontSize: "1.25rem",
                fontFamily: "var(--font-display-family)",
                margin: 0,
                color: "var(--color-ink)",
              }}
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close dialog"
            className="btn btn-secondary btn-sm"
            style={{
              padding: "0.25rem",
              minHeight: "32px",
              minWidth: "32px",
              width: "32px",
              height: "32px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <p
          id="confirm-dialog-message"
          style={{
            color: "var(--color-muted)",
            fontSize: "0.925rem",
            lineHeight: 1.5,
            marginBottom: "1.75rem",
          }}
        >
          {message}
        </p>

        <div
          className="flex items-center gap-3"
          style={{ justifyContent: "flex-end", flexWrap: "wrap" }}
        >
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-secondary"
            style={{ minHeight: "40px", padding: "0.5rem 1.15rem", fontSize: "0.9rem" }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${variant === "danger" ? "btn-danger" : "btn-primary"}`}
            style={{ minHeight: "40px", padding: "0.5rem 1.15rem", fontSize: "0.9rem" }}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
