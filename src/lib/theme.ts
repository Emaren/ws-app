export type ThemeMode = "dark" | "light" | "sepia";

export const THEME_STORAGE_KEY = "theme";
const THEME_META_COLORS: Record<ThemeMode, string> = {
  dark: "#0a0a0a",
  light: "#ffffff",
  sepia: "#f4ecd9",
};

export function normalizeTheme(value: string | null | undefined): ThemeMode | null {
  if (value === "dark" || value === "light" || value === "sepia") {
    return value;
  }
  return null;
}

export function getSystemDefaultTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }

  const html = document.documentElement;
  html.classList.toggle("dark", theme === "dark");
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

export function readThemeFromDocument(): ThemeMode {
  if (typeof document === "undefined") {
    return "dark";
  }

  const html = document.documentElement;
  const themed = normalizeTheme(html.getAttribute("data-theme"));
  if (themed) {
    return themed;
  }

  return html.classList.contains("dark") ? "dark" : "light";
}

export function cycleTheme(current: ThemeMode): ThemeMode {
  if (current === "dark") {
    return "light";
  }

  if (current === "light") {
    return "sepia";
  }

  return "dark";
}
