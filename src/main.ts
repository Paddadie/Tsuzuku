import "./style.css";
import type { Entry, Settings, SortOrder } from "./types";
import { SERIES_TYPES, SERIES_TYPE_ORDER, displayEmoji } from "./types";
import { readEntries, writeEntries } from "./storage/entriesRepo";
import { readSettings, writeSettings } from "./storage/settingsRepo";
import { requestPersistentStorage } from "./storage/localStore";
import { initEntryForm, type EntryDraft } from "./entryForm";
import { initSettingsView } from "./settings/settingsView";
import { applyTheme, followSystemTheme } from "./settings/theme";
import { $, escapeHtml } from "./ui/dom";
import { bump, collapse, floatLabel, playCssAnimation } from "./ui/animate";
import { capitalize, plural } from "./ui/format";
import { toast } from "./ui/toast";
import { initUpdatePrompt } from "./pwa/updatePrompt";

const loaded = readEntries();
let entries: Entry[] = loaded.entries;
let settings: Settings = readSettings();

const MARQUEE_GAP_PX = 48;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

const COMPARATORS: Record<SortOrder, (a: Entry, b: Entry) => number> = {
  alpha: (a, b) => collator.compare(a.title, b.title),
  recent: (a, b) => b.updatedAt - a.updatedAt || collator.compare(a.title, b.title),
};

function findEntry(id: string): Entry | undefined {
  return entries.find((e) => e.id === id);
}

// randomUUID n'existe qu'en contexte sécurisé (https ou localhost) : le repli sert quand
// on teste depuis un téléphone via l'IP locale du PC, en http.
function newId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Enregistre la liste ; en cas d'échec, prévient l'utilisateur et renvoie false. */
function persist(): boolean {
  const saved = writeEntries(entries);
  if (!saved) toast("Impossible d’enregistrer : le stockage du navigateur est indisponible ou plein.");
  return saved;
}

function commit(highlight?: Highlight): boolean {
  const saved = persist();
  render(highlight);
  return saved;
}

// ---------------------------------------------------------------- Liste

/** Carte à mettre en valeur après un rendu : nouvelle (elle glisse en place) ou modifiée. */
interface Highlight {
  id: string;
  isNew: boolean;
}

function render(highlight?: Highlight): void {
  const n = entries.length;
  $("count").textContent =
    n === 0 ? "Rien à suivre pour l’instant" : `${n} ${plural(n, "série")} ${plural(n, "suivie")}`;

  const list = $("list");
  if (n === 0) {
    list.innerHTML =
      '<div class="empty"><p>Aucune série suivie.<br>Ajoute ta première avec le bouton ci-dessous.</p></div>';
    return;
  }

  const groups = SERIES_TYPE_ORDER.map((type) => ({
    type,
    entries: entries.filter((e) => e.type === type).sort(COMPARATORS[settings.sort]),
  })).filter((g) => g.entries.length > 0);
  // Les titres « Mangas » / « Animes » ne servent qu'à séparer les deux types : avec un
  // seul type suivi, on n'affiche que les cartes.
  const showTitles = groups.length > 1;

  list.innerHTML = groups
    .map(
      (g) => `<section class="group" data-type="${g.type}">
      ${showTitles ? `<h2 class="section-title">${SERIES_TYPES[g.type].plural}<span class="section-count">${g.entries.length}</span></h2>` : ""}
      ${g.entries.map(cardHtml).join("")}
    </section>`,
    )
    .join("");

  if (highlight) {
    const card = list.querySelector(`.card[data-id="${CSS.escape(highlight.id)}"]`);
    card?.classList.add(highlight.isNew ? "card-new" : "card-flash");
  }
  requestAnimationFrame(setupMarquee);
}

// Toute la carte ouvre la fiche de modification (bouton .card-main étendu sur la carte) ;
// les boutons d'action rapide sont posés par-dessus.
function cardHtml(e: Entry): string {
  const info = SERIES_TYPES[e.type];
  const title = escapeHtml(e.title);
  const unit = capitalize(info.unit);
  const progress =
    e.season == null
      ? `<span class="progress">
          <span class="progress-label">${unit}</span>
          <span class="num display">${e.progress}</span>
        </span>`
      : `<span class="progress">
          <span class="season-badge" aria-label="Saison ${e.season}">S${e.season}</span>
          <span class="progress-label">${unit}</span>
          <span class="num display">${e.progress}</span>
        </span>
        <button type="button" class="season-link" data-action="next-season">
          <span>Passer à la saison ${e.season + 1}</span> ›
        </button>`;
  return `<div class="card" data-type="${e.type}" data-id="${escapeHtml(e.id)}">
    <button type="button" class="card-main" data-action="edit" aria-label="Modifier ${title}"></button>
    <span class="icon" aria-hidden="true">${escapeHtml(displayEmoji(e))}</span>
    <span class="body">
      <span class="title-wrap"><span class="title-text">${title}</span></span>
      ${progress}
    </span>
    <button type="button" class="plus1" data-action="plus" aria-label="+1 ${info.unit} pour ${title}">+1</button>
  </div>`;
}

// Fait défiler les titres trop longs pour leur carte. Le texte est dupliqué dans un
// span aria-hidden pour que la boucle soit continue sans être lue deux fois.
// Les titres déjà en défilement sont ignorés : on peut rappeler la fonction après avoir
// redessiné une seule carte.
function setupMarquee(): void {
  if (reducedMotion.matches) return;
  $("list")
    .querySelectorAll<HTMLElement>(".title-text:not(.marquee)")
    .forEach((span) => {
      const wrap = span.parentElement;
      if (!wrap || span.scrollWidth <= wrap.clientWidth + 2) return;
      const dist = span.scrollWidth + MARQUEE_GAP_PX;
      const copy = document.createElement("span");
      copy.setAttribute("aria-hidden", "true");
      copy.style.paddingLeft = `${MARQUEE_GAP_PX}px`;
      copy.textContent = span.textContent;
      span.append(copy);
      span.style.setProperty("--mq-dist", `${dist}px`);
      span.style.animationDuration = `${Math.max(4, dist / 45)}s`;
      span.classList.add("marquee");
    });
}

// Les actions rapides mettent à jour la carte en place plutôt que de redessiner la liste :
// la carte ne change pas de place sous le doigt (tri « Récents ») et les titres défilants
// ne redémarrent pas. Le nouvel ordre s'appliquera au prochain affichage de la liste.

function incrementProgress(card: HTMLElement, plusBtn: HTMLElement, entry: Entry): void {
  entry.progress += 1;
  entry.updatedAt = Date.now();
  persist();
  const num = card.querySelector<HTMLElement>(".num");
  if (num) {
    num.textContent = String(entry.progress);
    bump(num);
  }
  floatLabel(plusBtn, "+1");
}

// Passer à la saison suivante = saison + 1 et retour à l'épisode 1, en un seul geste,
// avec la possibilité d'annuler quelques secondes.
function nextSeason(entry: Entry): void {
  if (entry.season === null) return; // le lien n'existe que sur les animes suivis par saison
  const before = { season: entry.season, progress: entry.progress, updatedAt: entry.updatedAt };
  entry.season += 1;
  entry.progress = 1;
  entry.updatedAt = Date.now();
  const after = { season: entry.season, progress: entry.progress };
  const saved = persist();
  redrawCard(entry);
  if (!saved) return; // garde le message d'erreur à l'écran plutôt que le toast « Annuler »
  toast(`${entry.title} : saison ${entry.season}, épisode 1`, {
    label: "Annuler",
    onClick: () => {
      // Si la série a bougé entre-temps (+1, correction dans la fiche, suppression),
      // revenir en arrière effacerait ce changement : on préfère ne rien faire.
      const unchanged =
        findEntry(entry.id) === entry && entry.season === after.season && entry.progress === after.progress;
      if (!unchanged) {
        toast("La série a été modifiée entre-temps : rien n’a été annulé.");
        return;
      }
      Object.assign(entry, before);
      persist();
      redrawCard(entry);
    },
  });
}

/** Redessine une seule carte et fait rebondir sa progression. */
function redrawCard(entry: Entry): void {
  const card = $("list").querySelector(`.card[data-id="${CSS.escape(entry.id)}"]`);
  if (!card) return;
  card.outerHTML = cardHtml(entry);
  const fresh = $("list").querySelector(`.card[data-id="${CSS.escape(entry.id)}"]`);
  fresh?.querySelectorAll<HTMLElement>(".season-badge, .num").forEach(bump);
  requestAnimationFrame(setupMarquee);
}

// ---------------------------------------------------------------- Ajout / modification

function saveEntry(draft: EntryDraft, editingId: string | null): void {
  const existing = editingId ? findEntry(editingId) : undefined;
  if (existing) {
    // Le tri « Récents » suit la progression : corriger le titre, l'emoji ou le type
    // (ou enregistrer sans rien changer) ne fait pas remonter la série.
    const progressed = draft.progress !== existing.progress || draft.season !== existing.season;
    Object.assign(existing, draft, progressed ? { updatedAt: Date.now() } : {});
    commit({ id: existing.id, isNew: false });
  } else {
    const id = newId();
    entries.push({ id, ...draft, updatedAt: Date.now() });
    commit({ id, isNew: true });
  }
}

// Suppression immédiate, annulable quelques secondes depuis le toast (comme la saison suivante).
async function deleteEntry(id: string): Promise<void> {
  const entry = findEntry(id);
  if (!entry) return;
  const card = $("list").querySelector<HTMLElement>(`.card[data-id="${CSS.escape(id)}"]`);
  if (card) await collapse(card);
  entries = entries.filter((e) => e !== entry);
  if (!commit()) return; // garde le message d'erreur à l'écran plutôt que le toast « Annuler »
  toast(`Série « ${entry.title} » supprimée.`, {
    label: "Annuler",
    onClick: () => {
      if (findEntry(id)) return;
      entries.push(entry);
      commit({ id, isNew: true });
    },
  });
}

// ---------------------------------------------------------------- Pages et réglages

function changeSettings(next: Settings): void {
  const sortChanged = next.sort !== settings.sort;
  settings = next;
  if (!writeSettings(settings)) toast("Impossible d’enregistrer les réglages.");
  applyTheme(settings.theme, true);
  if (sortChanged) render();
}

function replaceEntries(next: Entry[]): boolean {
  entries = next;
  const saved = commit();
  settingsView.refresh();
  return saved;
}

// La page Réglages glisse par-dessus la liste depuis la droite, comme une navigation iOS.
// Pendant ce temps la liste reste affichée dessous mais inerte (ni focus ni lecteur d'écran).
async function showPage(page: "list" | "settings"): Promise<void> {
  const listPage = $("listPage");
  const settingsPage = $("settingsPage");
  if (page === "settings") {
    settingsView.refresh();
    settingsPage.hidden = false;
    listPage.inert = true;
    await playCssAnimation(settingsPage, "slide-in");
  } else {
    listPage.inert = false;
    await playCssAnimation(settingsPage, "slide-out");
    settingsPage.hidden = true;
  }
}

// ---------------------------------------------------------------- Démarrage

const entryForm = initEntryForm({ onSave: saveEntry, onDelete: (id) => void deleteEntry(id) });
const settingsView = initSettingsView(settings, {
  getEntries: () => entries,
  replaceEntries,
  onSettingsChange: changeSettings,
});

$("list").addEventListener("click", (ev) => {
  const actionEl = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]");
  const card = actionEl?.closest<HTMLElement>(".card");
  const entry = card?.dataset.id ? findEntry(card.dataset.id) : undefined;
  if (!actionEl || !card || !entry) return;
  const action = actionEl.dataset.action;
  if (action === "plus") incrementProgress(card, actionEl, entry);
  else if (action === "next-season") nextSeason(entry);
  else entryForm.open(entry);
});
$("openAdd").addEventListener("click", () => entryForm.open());
$("openSettings").addEventListener("click", () => void showPage("settings"));
$("closeSettings").addEventListener("click", () => void showPage("list"));

// Sans écouteur touchstart, Safari iOS n'applique pas les styles :active (effet d'appui).
document.addEventListener("touchstart", () => {}, { passive: true });

// Recalcule les titres défilants quand la largeur change (rotation de l'écran).
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  render();
});

applyTheme(settings.theme);
followSystemTheme(() => settings.theme);
render();
if (loaded.recovered) {
  toast("Les données enregistrées étaient illisibles : une copie a été mise de côté (Réglages → Données).");
}
requestPersistentStorage();
initUpdatePrompt();
