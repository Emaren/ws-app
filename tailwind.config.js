// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Keep typography lean; most article styling comes from WysiwygStyle
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            a: { textDecoration: "underline", textUnderlineOffset: "3px" },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
  // Purge-proof utilities referenced dynamically in components
  safelist: [
    // Header / media sizing
    "max-w-[560px]",
    "translate-x-[10px]",
    "md:max-h-[180px]",
    "w-[180px]",

    // FloatAd image width caps
    "max-w-[75%]",
    "max-w-[80%]",

    // FloatAd container sizes (right: Homesteader)
    "w-[289px]","h-[170px]","md:w-[300px]","md:h-[180px]","lg:w-[320px]","lg:h-[190px]",
    // FloatAd container sizes (left: Beaverlodge)
    "w-[320px]","h-[158px]","md:w-[328px]","md:h-[170px]","lg:w-[340px]","lg:h-[180px]",

    // BigThumbs colors/rings
    "text-emerald-500","text-rose-500",
    "bg-emerald-500/5","hover:bg-emerald-500/10","active:bg-emerald-500/15","focus-visible:ring-emerald-500/40",
    "bg-rose-500/5","hover:bg-rose-500/10","active:bg-rose-500/15","focus-visible:ring-rose-500/40",
  ],
};
