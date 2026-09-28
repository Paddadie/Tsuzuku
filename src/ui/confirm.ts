import { $ } from "./dom";

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Libellé du bouton qui valide (ex. « Supprimer »). */
  confirmLabel: string;
}

/**
 * Petite fenêtre de confirmation centrée, au style de l'app : toutes les confirmations de
 * l'app passent par ici plutôt que par window.confirm (qui affiche l'adresse du site sur
 * iPhone et ignore le thème). Résout true si l'action est confirmée ; Annuler, Échap ou
 * un toucher sur le fond résolvent false.
 */
export function confirmDialog({ title, message, confirmLabel }: ConfirmOptions): Promise<boolean> {
  const dialog = $<HTMLDialogElement>("confirmDialog");
  $("confirmTitle").textContent = title;
  $("confirmMessage").textContent = message;
  $("confirmOk").textContent = confirmLabel;
  dialog.returnValue = "";

  const onBackdropClick = (ev: MouseEvent): void => {
    if (ev.target === dialog) dialog.close();
  };
  dialog.addEventListener("click", onBackdropClick);
  dialog.showModal();

  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => {
        dialog.removeEventListener("click", onBackdropClick);
        // Les boutons du <form method="dialog"> ferment la fenêtre avec leur `value`.
        resolve(dialog.returnValue === "confirm");
      },
      { once: true },
    );
  });
}
