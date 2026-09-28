import type { ThemePreference } from "../types";

const systemLight = window.matchMedia("(prefers-color-scheme: light)");
const FADE_MS = 400;
let fadeTimer: number | undefined;

// Le CSS ne connaît que data-theme="light" | "dark" : le choix « Système » est résolu ici.
// Le script inline d'index.html fait la même chose au chargement, avant le premier affichage.
// `fade` : les couleurs passent de l'ancien au nouveau thème en fondu (classe .theme-fade).
export function applyTheme(preference: ThemePreference, fade = false): void {
  const resolved = preference === "system" ? (systemLight.matches ? "light" : "dark") : preference;
  const root = document.documentElement;

  if (fade && root.dataset.theme !== resolved) {
    root.classList.add("theme-fade");
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => root.classList.remove("theme-fade"), FADE_MS);
  }
  root.dataset.theme = resolved;

  const paper = getComputedStyle(root).getPropertyValue("--paper").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", paper);
}

/** Suit les changements clair/sombre du système tant que le réglage est « Système ». */
export function followSystemTheme(getPreference: () => ThemePreference): void {
  systemLight.addEventListener("change", () => {
    if (getPreference() === "system") applyTheme("system", true);
  });
}
