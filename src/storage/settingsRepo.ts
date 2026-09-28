import type { Settings, SortOrder, ThemePreference } from "../types";
import { isRecord, parseJson, readItem, writeItem } from "./localStore";

// ⚠️ Clé et format aussi lus par le script inline d'index.html (application du thème
// avant le premier affichage).
const SETTINGS_KEY = "tsuzuku:settings";

const THEMES: readonly ThemePreference[] = ["system", "light", "dark"];
const SORTS: readonly SortOrder[] = ["alpha", "recent"];

const DEFAULT_SETTINGS: Settings = { theme: "system", sort: "alpha" };

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEMES.includes(value as ThemePreference);
}

export function isSortOrder(value: unknown): value is SortOrder {
  return SORTS.includes(value as SortOrder);
}

// Un réglage absent ou invalide retombe simplement sur sa valeur par défaut.
export function readSettings(): Settings {
  const raw = readItem(SETTINGS_KEY);
  const stored = raw === null ? undefined : parseJson(raw);
  const value = isRecord(stored) ? stored : {};
  return {
    theme: isThemePreference(value.theme) ? value.theme : DEFAULT_SETTINGS.theme,
    sort: isSortOrder(value.sort) ? value.sort : DEFAULT_SETTINGS.sort,
  };
}

export function writeSettings(settings: Settings): boolean {
  return writeItem(SETTINGS_KEY, JSON.stringify(settings));
}
