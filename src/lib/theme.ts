export type ThemeMode = "dark" | "light" | "sepia";

export const THEME_STORAGE_KEY = "theme";

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
