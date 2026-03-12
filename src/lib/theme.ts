export type ThemeMode =
  | "black"
  | "grey"
  | "white"
  | "sepia"
  | "walnut"
  | "crimson"
  | "midnight";

export const THEME_STORAGE_KEY = "theme";
export const THEME_LABELS: Record<ThemeMode, string> = {
  black: "Black",
  grey: "Grey",
  white: "White",
  sepia: "Sepia",
  walnut: "Walnut",
  crimson: "Crimson",
  midnight: "Midnight",
};

const THEME_META_COLORS: Record<ThemeMode, string> = {
  black: "#090909",
  grey: "#202123",
  white: "#ffffff",
  sepia: "#f4ecd9",
  walnut: "#16110d",
  crimson: "#1a0d0d",
  midnight: "#09111d",
};

const THEME_ALIASES: Record<string, ThemeMode> = {
  black: "black",
  dark: "black",
  grey: "grey",
  gray: "grey",
  white: "white",
  light: "white",
  sepia: "sepia",
  brown: "walnut",
  walnut: "walnut",
  rugged: "walnut",
  red: "crimson",
  crimson: "crimson",
  blue: "midnight",
  midnight: "midnight",
};

export function normalizeTheme(value: string | null | undefined): ThemeMode | null {
  if (!value) return null;
  return THEME_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function getSystemDefaultTheme(): ThemeMode {
  return "black";
}

export function getThemeLabel(theme: ThemeMode | null | undefined): string {
  return theme ? THEME_LABELS[theme] : "Black";
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }

  const html = document.documentElement;
  html.classList.toggle(
    "dark",
    theme === "black" ||
      theme === "grey" ||
      theme === "walnut" ||
      theme === "crimson" ||
      theme === "midnight",
  );
  html.setAttribute("data-theme", theme);

  const metaThemeColor = document.querySelector(
    'meta[name="theme-color"]',
  ) as HTMLMetaElement | null;
  if (metaThemeColor) {
    metaThemeColor.content = THEME_META_COLORS[theme];
  }
}

export function readThemeFromStorage(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function persistTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function readThemeFromDocument(): ThemeMode | null {
  if (typeof document === "undefined") {
    return null;
  }

  const html = document.documentElement;
  const themed = normalizeTheme(html.getAttribute("data-theme"));
  if (themed) {
    return themed;
  }

  if (html.classList.contains("dark")) {
    return "black";
  }

  return null;
}

export function cycleTheme(current: ThemeMode): ThemeMode {
  if (current === "black") {
    return "grey";
  }

  if (current === "grey") {
    return "white";
  }

  if (current === "white") {
    return "sepia";
  }

  if (current === "sepia") {
    return "walnut";
  }

  if (current === "walnut") {
    return "crimson";
  }

  if (current === "crimson") {
    return "midnight";
  }

  return "black";
}
