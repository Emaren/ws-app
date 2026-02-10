export type ThemeMode = "gray" | "dark" | "light" | "sepia";

export const THEME_STORAGE_KEY = "theme";
const THEME_META_COLORS: Record<ThemeMode, string> = {
  gray: "#202123",
  dark: "#0a0a0a",
  light: "#ffffff",
  sepia: "#f4ecd9",
};

export function normalizeTheme(value: string | null | undefined): ThemeMode | null {
  if (value === "gray" || value === "dark" || value === "light" || value === "sepia") {
    return value;
  }
  return null;
}

export function getSystemDefaultTheme(): ThemeMode {
  return "gray";
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }

  const html = document.documentElement;
  html.classList.toggle("dark", theme === "dark" || theme === "gray");
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
    return "dark";
  }

  return null;
}

export function cycleTheme(current: ThemeMode): ThemeMode {
  if (current === "gray") {
    return "dark";
  }

  if (current === "dark") {
    return "light";
  }

  if (current === "light") {
    return "sepia";
  }

  return "gray";
}
