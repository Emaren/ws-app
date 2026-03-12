"use client";

import type { ThemeMode } from "@/lib/theme";

const THEME_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  chipClass: string;
}> = [
  {
    value: "black",
    label: "Black",
    chipClass: "bg-[#090909] border border-[#7d7d7d]",
  },
  {
    value: "grey",
    label: "Grey",
    chipClass: "bg-[#202123] border border-[#7d7d7d]",
  },
  {
    value: "white",
    label: "White",
    chipClass: "bg-white border border-black/30",
  },
  {
    value: "sepia",
    label: "Sepia",
    chipClass: "bg-[#e9ddc5] border border-[#a27d48]",
  },
  {
    value: "walnut",
    label: "Walnut",
    chipClass: "bg-[#1b1511] border border-[#7a5a2e]",
  },
  {
    value: "crimson",
    label: "Crimson",
    chipClass: "bg-[#441515] border border-[#c16d6d]",
  },
  {
    value: "midnight",
    label: "Midnight",
    chipClass: "bg-[#0e223f] border border-[#5f8fcb]",
  },
];

export default function ThemeCircles({
  value,
  onChange,
  compact = false,
}: {
  value: ThemeMode;
  onChange: (theme: ThemeMode) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center bg-transparent ${compact ? "gap-1.5" : "gap-2"}`}
      aria-label="Theme selector"
      role="group"
    >
      {THEME_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.label} theme`}
            aria-pressed={active}
            title={`${option.label} theme`}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition cursor-pointer focus:outline-none ${
              active ? "scale-105 opacity-100" : "opacity-85 hover:opacity-100"
            }`}
          >
            <span className={`h-4 w-4 rounded-full ${option.chipClass}`} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
