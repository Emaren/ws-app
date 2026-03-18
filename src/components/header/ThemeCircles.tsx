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
  dense = false,
  className = "",
}: {
  value: ThemeMode;
  onChange: (theme: ThemeMode) => void;
  compact?: boolean;
  dense?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center bg-transparent ${dense ? "gap-1" : compact ? "gap-1.5" : "gap-2"} ${className}`.trim()}
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
            className={`inline-flex ${dense ? "h-5 w-5" : "h-6 w-6"} items-center justify-center rounded-full transition cursor-pointer focus:outline-none ${
              active ? "scale-105 opacity-100" : "opacity-85 hover:opacity-100"
            }`}
          >
            <span
              className={`${dense ? "h-3.5 w-3.5" : "h-4 w-4"} rounded-full ${option.chipClass}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
