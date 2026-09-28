import { $ } from "./dom";

const DURATION_MS = 3500;
// Plus long quand il y a une action à faire (ex. « Annuler »), pour laisser le temps de réagir.
const DURATION_WITH_ACTION_MS = 5000;
let hideTimer: number | undefined;

export interface ToastAction {
  label: string;
  onClick(): void;
}

/** Message éphémère en haut de l'écran, avec éventuellement un bouton d'action. */
export function toast(message: string, action?: ToastAction): void {
  const el = $("toast");
  const text = document.createElement("span");
  text.textContent = message;
  el.replaceChildren(text);

  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast-action";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      hide();
      action.onClick();
    });
    el.append(button);
  }

  el.classList.add("show");
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hide, action ? DURATION_WITH_ACTION_MS : DURATION_MS);
}

function hide(): void {
  window.clearTimeout(hideTimer);
  $("toast").classList.remove("show");
}
