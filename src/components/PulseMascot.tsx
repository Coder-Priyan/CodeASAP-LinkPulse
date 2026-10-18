import React from "react";

export type PulseMood = "happy" | "thinking" | "sad" | "surprised";
export type MascotMood = PulseMood;

interface PulseMascotProps {
  mood?: PulseMood;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export function PulseMascot({
  mood = "happy",
  size = 120,
  className = "",
  style,
  ariaLabel,
}: PulseMascotProps) {
  const label = ariaLabel || `Pulse mascot feeling ${mood}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      className={`pulse-mascot pulse-${mood} ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      {/* Soft Drop Shadow (neo-brutalist hard offset) */}
      <rect
        x="24"
        y="36"
        width="112"
        height="100"
        rx="26"
        fill="#14272B"
      />

      {/* Antenna post */}
      <line
        x1="80"
        y1="34"
        x2="80"
        y2="16"
        stroke="#14272B"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Antenna pulse orb */}
      <circle
        cx="80"
        cy="14"
        r="9"
        fill="#E8806A"
        stroke="#14272B"
        strokeWidth="3.5"
      />
      <circle cx="77" cy="11" r="2.5" fill="#FFFFFF" />

      {/* Main Body */}
      <rect
        x="20"
        y="32"
        width="112"
        height="100"
        rx="26"
        fill="#0F5C5C"
        stroke="#14272B"
        strokeWidth="3.5"
      />

      {/* Ears / Side nubs */}
      <rect
        x="10"
        y="66"
        width="12"
        height="24"
        rx="6"
        fill="#F4C95D"
        stroke="#14272B"
        strokeWidth="3.5"
      />
      <rect
        x="130"
        y="66"
        width="12"
        height="24"
        rx="6"
        fill="#F4C95D"
        stroke="#14272B"
        strokeWidth="3.5"
      />

      {/* Belly Screen (Light Highlight with Heartbeat) */}
      <rect
        x="36"
        y="78"
        width="80"
        height="44"
        rx="14"
        fill="#D9EDE6"
        stroke="#14272B"
        strokeWidth="3"
      />

      {/* Heartbeat Line on Belly Screen */}
      {mood === "sad" ? (
        <path
          d="M 44 100 L 62 100 L 68 106 L 74 94 L 80 102 L 86 100 L 108 100"
          stroke="#E8806A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : mood === "surprised" ? (
        <path
          d="M 44 100 L 58 100 L 64 86 L 70 114 L 76 84 L 82 106 L 88 100 L 108 100"
          stroke="#0F5C5C"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : mood === "thinking" ? (
        <path
          d="M 44 100 L 60 100 L 66 92 L 72 100 L 78 92 L 84 100 L 108 100"
          stroke="#F4C95D"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        /* happy default pulse */
        <path
          d="M 44 100 L 60 100 L 66 90 L 72 110 L 78 88 L 84 104 L 90 100 L 108 100"
          stroke="#A5D6A0"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Eyes & Faces by Mood */}
      {mood === "happy" && (
        <g>
          {/* Left Eye */}
          <circle cx="56" cy="56" r="10" fill="#FFFFFF" stroke="#14272B" strokeWidth="3" />
          <circle cx="57" cy="56" r="5" fill="#14272B" />
          <circle cx="55" cy="54" r="2" fill="#FFFFFF" />

          {/* Right Eye */}
          <circle cx="96" cy="56" r="10" fill="#FFFFFF" stroke="#14272B" strokeWidth="3" />
          <circle cx="97" cy="56" r="5" fill="#14272B" />
          <circle cx="95" cy="54" r="2" fill="#FFFFFF" />

          {/* Cheeks */}
          <circle cx="44" cy="64" r="4.5" fill="#E8806A" opacity="0.6" />
          <circle cx="108" cy="64" r="4.5" fill="#E8806A" opacity="0.6" />

          {/* Big Smile */}
          <path
            d="M 70 59 Q 76 68 82 59"
            stroke="#14272B"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}

      {mood === "thinking" && (
        <g>
          {/* Eyebrow raised on left */}
          <path d="M 48 44 Q 56 40 64 45" stroke="#14272B" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Flat brow on right */}
          <path d="M 88 47 Q 96 46 104 47" stroke="#14272B" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Left Eye looking up */}
          <circle cx="56" cy="56" r="10" fill="#FFFFFF" stroke="#14272B" strokeWidth="3" />
          <circle cx="58" cy="53" r="5" fill="#14272B" />
          <circle cx="56" cy="51" r="2" fill="#FFFFFF" />

          {/* Right Eye looking up */}
          <circle cx="96" cy="56" r="10" fill="#FFFFFF" stroke="#14272B" strokeWidth="3" />
          <circle cx="98" cy="53" r="5" fill="#14272B" />
          <circle cx="96" cy="51" r="2" fill="#FFFFFF" />

          {/* Curious tilted mouth */}
          <path
            d="M 72 63 Q 77 62 82 60"
            stroke="#14272B"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}

      {mood === "sad" && (
        <g>
          {/* Sad angled eyebrows */}
          <path d="M 50 46 L 62 50" stroke="#14272B" strokeWidth="3" strokeLinecap="round" />
          <path d="M 102 46 L 90 50" stroke="#14272B" strokeWidth="3" strokeLinecap="round" />

          {/* Left Eye */}
          <circle cx="56" cy="58" r="10" fill="#FFFFFF" stroke="#14272B" strokeWidth="3" />
          <circle cx="56" cy="60" r="5" fill="#14272B" />
          <circle cx="54" cy="58" r="2" fill="#FFFFFF" />

          {/* Right Eye with tiny tear */}
          <circle cx="96" cy="58" r="10" fill="#FFFFFF" stroke="#14272B" strokeWidth="3" />
          <circle cx="96" cy="60" r="5" fill="#14272B" />
          <circle cx="94" cy="58" r="2" fill="#FFFFFF" />
          {/* Tear */}
          <ellipse cx="106" cy="68" rx="2.5" ry="3.5" fill="#0F5C5C" />

          {/* Downward Mouth */}
          <path
            d="M 71 67 Q 76 60 81 67"
            stroke="#14272B"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}

      {mood === "surprised" && (
        <g>
          {/* High arched brows */}
          <path d="M 48 42 Q 56 36 64 42" stroke="#14272B" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 88 42 Q 96 36 104 42" stroke="#14272B" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Wide round eyes */}
          <circle cx="56" cy="54" r="11" fill="#FFFFFF" stroke="#14272B" strokeWidth="3" />
          <circle cx="56" cy="54" r="6" fill="#14272B" />
          <circle cx="54" cy="52" r="2.5" fill="#FFFFFF" />

          <circle cx="96" cy="54" r="11" fill="#FFFFFF" stroke="#14272B" strokeWidth="3" />
          <circle cx="96" cy="54" r="6" fill="#14272B" />
          <circle cx="94" cy="52" r="2.5" fill="#FFFFFF" />

          {/* Open 'O' Mouth */}
          <ellipse
            cx="76"
            cy="65"
            rx="5"
            ry="7"
            fill="#F4C95D"
            stroke="#14272B"
            strokeWidth="3"
          />
        </g>
      )}

      {/* Feet / Pedestal */}
      <rect
        x="42"
        y="128"
        width="26"
        height="12"
        rx="6"
        fill="#F4C95D"
        stroke="#14272B"
        strokeWidth="3.5"
      />
      <rect
        x="84"
        y="128"
        width="26"
        height="12"
        rx="6"
        fill="#F4C95D"
        stroke="#14272B"
        strokeWidth="3.5"
      />
    </svg>
  );
}
