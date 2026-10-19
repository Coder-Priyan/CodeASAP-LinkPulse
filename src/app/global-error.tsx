"use client";

import { useEffect } from "react";
import { PulseMascot } from "@/components/PulseMascot";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("LinkPulse root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#FBF7EF",
          fontFamily: "'Nunito', system-ui, -apple-system, sans-serif",
          color: "#14272B",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "90%",
            backgroundColor: "#FFFFFF",
            border: "2.5px solid #14272B",
            borderRadius: "16px",
            boxShadow: "4px 4px 0 #14272B",
            padding: "2.5rem 2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              justifyContent: "center",
              marginBottom: "1.25rem",
            }}
          >
            <PulseMascot mood="thinking" size={110} />
          </div>

          <h1
            style={{
              fontSize: "2rem",
              marginBottom: "0.25rem",
              fontFamily: "'Lilita One', 'Bebas Neue', sans-serif",
            }}
          >
            System Error
          </h1>

          <p
            style={{
              color: "#4F6266",
              fontSize: "0.95rem",
              marginBottom: "2rem",
              lineHeight: 1.55,
            }}
          >
            A root-level application error occurred. Click below to re-initialize
            the interface.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            style={{
              backgroundColor: "#0F5C5C",
              color: "#FFFFFF",
              border: "2.5px solid #14272B",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "3px 3px 0 #14272B",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
