import type { Entry, SeriesType } from "./types";
import { SERIES_TYPES, isSeriesType } from "./types";
import { isSingleEmoji } from "./emoji";
import { $, radioValue, setRadioValue } from "./ui/dom";
import { playCssAnimation } from "./ui/animate";
import { confirmDialog } from "./ui/confirm";
import { capitalize } from "./ui/format";

/** Champs saisis dans le formulaire, communs à l'ajout et à la modification. */
export type EntryDraft = Pick<Entry, "title" | "type" | "progress" | "season" | "emoji">;

export interface EntryFormDeps {
  /** editingId vaut null pour un ajout. */
  onSave(draft: EntryDraft, editingId: string | null): void;
  onDelete(id: string): void;
}

export interface EntryForm {
  /** Sans argument : ajout. Avec une série : modification. */
  open(entry?: Entry): void;
}

// Une seule bottom sheet sert à l'ajout et à la modification : mêmes champs,
// seuls le titre, le libellé du bouton et le bouton de suppression changent.
export function initEntryForm(deps: EntryFormDeps): EntryForm {
  const dialog = $<HTMLDialogElement>("entryDialog");
  const form = $<HTMLFormElement>("entryForm");
  const heading = $("entryDialogTitle");
  const emojiInput = $<HTMLInputElement>("emojiInput");
  const titleInput = $<HTMLInputElement>("titleInput");
  const seasonInput = $<HTMLInputElement>("seasonInput");
  const progressInput = $<HTMLInputElement>("progressInput");
  const errorEl = $("formErr");
  let editingId: string | null = null;
  let editingTitle = ""; // titre enregistré, pour la confirmation de suppression

  const selectedType = (): SeriesType => {
    const value = radioValue(form, "type");
    return isSeriesType(value) ? value : "manga";
  };

  // Le suivi par saison n'existe que pour les animes.
  const tracksSeasons = (): boolean => selectedType() === "anime" && radioValue(form, "tracking") === "seasons";

  // Affiche les champs et libellés qui correspondent au type et au mode de suivi choisis.
  const syncFormMode = (): void => {
    const info = SERIES_TYPES[selectedType()];
    $("progressLabel").textContent = `${capitalize(info.unit)} actuel`;
    emojiInput.placeholder = info.defaultEmoji;
    $("trackingField").hidden = selectedType() !== "anime";
    $("seasonField").hidden = !tracksSeasons();
  };

  // L'emoji par défaut est un placeholder : on le retire pendant la saisie pour que le champ
  // se voie vide, et il revient en sortant si rien n'a été tapé. (En CSS, `color: transparent`
  // ne masquerait pas un emoji, dessiné en couleur quelle que soit la couleur du texte.)
  emojiInput.addEventListener("focus", () => {
    emojiInput.placeholder = "";
  });
  emojiInput.addEventListener("blur", syncFormMode);

  const showError = (message: string, field?: HTMLInputElement): void => {
    errorEl.textContent = message;
    errorEl.hidden = !message;
    field?.focus();
  };

  // Fermeture animée (la sheet redescend) ; l'ouverture est animée en CSS.
  const closeSheet = async (): Promise<void> => {
    if (!dialog.open || dialog.classList.contains("closing")) return;
    await playCssAnimation(dialog, "closing");
    dialog.close();
  };

  function open(entry?: Entry): void {
    const isEdit = entry !== undefined;
    editingId = entry?.id ?? null;
    editingTitle = entry?.title ?? "";

    heading.textContent = isEdit ? "Modifier la série" : "Nouvelle série";
    $("entrySave").textContent = isEdit ? "Enregistrer" : "Ajouter";
    titleInput.value = entry?.title ?? "";
    emojiInput.value = entry?.emoji ?? "";
    progressInput.value = String(entry?.progress ?? 1);
    seasonInput.value = String(entry?.season ?? 1);
    setRadioValue(form, "type", entry?.type ?? "manga");
    setRadioValue(form, "tracking", entry?.season != null ? "seasons" : "episodes");
    syncFormMode();
    showError("");
    $("editDelete").hidden = !isEdit;

    // Ajout : focus sur le titre pour taper directement. Modification : focus sur le
    // titre de la sheet, pour ne pas ouvrir le clavier alors qu'on vient surtout
    // ajuster la progression.
    titleInput.autofocus = !isEdit;
    heading.autofocus = isEdit;
    dialog.showModal();
  }

  form.addEventListener("change", (ev) => {
    const name = (ev.target as HTMLInputElement).name;
    if (name === "type" || name === "tracking") syncFormMode();
  });

  // Boutons − / + : ils agissent sur le champ de leur propre stepper.
  form.addEventListener("click", (ev) => {
    const stepBtn = (ev.target as HTMLElement).closest<HTMLElement>("[data-step]");
    const input = stepBtn?.closest(".stepper")?.querySelector("input");
    if (!stepBtn || !input) return;
    const step = Number(stepBtn.dataset.step);
    input.value = String(Math.max(minOf(input), readInt(input) + step));
  });

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const title = titleInput.value.trim();
    const emoji = emojiInput.value.trim();
    if (!title) return showError("Donne un titre à la série.", titleInput);
    if (emoji && !isSingleEmoji(emoji)) {
      return showError("Un seul emoji, ou laisse vide pour garder celui par défaut.", emojiInput);
    }
    deps.onSave(
      {
        title,
        emoji,
        type: selectedType(),
        progress: readInt(progressInput),
        season: tracksSeasons() ? readInt(seasonInput) : null,
      },
      editingId,
    );
    void closeSheet();
  });

  $("entryCancel").addEventListener("click", () => void closeSheet());
  // Suppression confirmée dans une pop-up, par-dessus la sheet.
  $("editDelete").addEventListener("click", async () => {
    const id = editingId;
    const confirmed = await confirmDialog({
      title: "Supprimer cette série ?",
      message: `« ${editingTitle} » et sa progression seront définitivement supprimées.`,
      confirmLabel: "Supprimer",
    });
    if (!confirmed) return;
    await closeSheet(); // la carte se replie une fois la sheet refermée
    if (id) deps.onDelete(id);
  });

  // Un clic sur le fond assombri (hors du contenu de la sheet) ferme la sheet.
  dialog.addEventListener("click", (ev) => {
    if (ev.target === dialog) void closeSheet();
  });
  // Touche Échap : on remplace la fermeture native, immédiate, par la fermeture animée.
  dialog.addEventListener("cancel", (ev) => {
    ev.preventDefault();
    void closeSheet();
  });
  dialog.addEventListener("close", () => {
    editingId = null;
  });

  return { open };
}

/** Entier lu dans un champ numérique, jamais sous son attribut `min`. */
function readInt(input: HTMLInputElement): number {
  return Math.max(minOf(input), Math.floor(Number(input.value)) || 0);
}

function minOf(input: HTMLInputElement): number {
  return Number(input.min) || 0;
}
