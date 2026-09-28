import { $ } from "./dom";

const DURATION_MS = 3500;
let hideTimer: number | undefined;

/** Message éphémère en haut de l'écran. */
export function toast(message: string): void {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => el.classList.remove("show"), DURATION_MS);
}
