"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

const TOAST_EVENT = "linkpulse:toast";

/**
 * Global helper to trigger a toast message from anywhere in client code.
 */
export const toast = {
  success: (message: string, duration = 4000) => {
    dispatchToast({ message, type: "success", duration });
  },
  error: (message: string, duration = 4500) => {
    dispatchToast({ message, type: "error", duration });
  },
  info: (message: string, duration = 4000) => {
    dispatchToast({ message, type: "info", duration });
  },
};

function dispatchToast(toastData: Omit<ToastMessage, "id">) {
  if (typeof window !== "undefined") {
    const detail: ToastMessage = {
      ...toastData,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
  }
}

interface ToastContainerProps {
  /** Optional custom position class */
  className?: string;
}

export function ToastContainer({ className = "" }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (!customEvent.detail) return;
      const newToast = customEvent.detail;
      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        removeToast(newToast.id);
      }, newToast.duration || 4000);

      return () => clearTimeout(timer);
    };

    window.addEventListener(TOAST_EVENT, handleToastEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleToastEvent);
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className={`toast-deck ${className}`}
      style={{
        position: "fixed",
        bottom: "1.25rem",
        right: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
        zIndex: 9999,
        maxWidth: "min(400px, 92vw)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const isError = t.type === "error";
        const isSuccess = t.type === "success";

        const bg = isError
          ? "var(--color-coral-light)"
          : isSuccess
          ? "var(--color-green-light)"
          : "var(--color-blue-light)";

        const icon = isError ? (
          <AlertCircle size={18} strokeWidth={2.5} style={{ flexShrink: 0, color: "var(--color-ink)" }} />
        ) : isSuccess ? (
          <CheckCircle2 size={18} strokeWidth={2.5} style={{ flexShrink: 0, color: "var(--color-ink)" }} />
        ) : (
          <Info size={18} strokeWidth={2.5} style={{ flexShrink: 0, color: "var(--color-ink)" }} />
        );

        return (
          <div
            key={t.id}
            role={isError ? "alert" : "status"}
            aria-live={isError ? "assertive" : "polite"}
            className="toast-card"
            style={{
              pointerEvents: "auto",
              backgroundColor: bg,
              color: "var(--color-ink)",
              border: "var(--border-thick)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-hard-sm)",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              animation: "slideInUp 0.18s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
              {icon}
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                }}
              >
                {t.message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              className="btn btn-secondary btn-sm"
              style={{
                padding: "0.2rem",
                minHeight: "28px",
                minWidth: "28px",
                width: "28px",
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                borderRadius: "var(--radius-sm)",
              }}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
