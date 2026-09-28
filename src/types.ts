export type SeriesType = "manga" | "anime";

export interface Entry {
  id: string;
  title: string;
  type: SeriesType;
  /** Chapitre (manga) ou épisode (anime) en cours. */
  progress: number;
  /** Saison en cours pour un anime suivi par saison, null s'il est suivi en épisodes seuls. */
  season: number | null;
  /** Emoji choisi, ou chaîne vide pour utiliser l'emoji par défaut du type. */
  emoji: string;
  /**
   * Timestamp (ms) de la dernière progression (chapitre, épisode ou saison), utilisé par le
   * tri « Récents ». Changer le titre, l'emoji ou le type ne le modifie pas.
   */
  updatedAt: number;
}

interface SeriesTypeInfo {
  plural: string;
  unit: string;
  defaultEmoji: string;
}

// Libellés et emoji par défaut de chaque type. Ajouter un type = ajouter une entrée ici, ses
// couleurs dans style.css et son bouton radio dans index.html. Le suivi par saison, lui, est
// réservé aux animes en dur (entryForm.ts, entriesRepo.ts, champ « Suivi » d'index.html).
export const SERIES_TYPES: Record<SeriesType, SeriesTypeInfo> = {
  manga: { plural: "Mangas", unit: "chapitre", defaultEmoji: "📖" },
  anime: { plural: "Animes", unit: "épisode", defaultEmoji: "📺" },
};

export const SERIES_TYPE_ORDER = Object.keys(SERIES_TYPES) as SeriesType[];

export function isSeriesType(value: unknown): value is SeriesType {
  return typeof value === "string" && value in SERIES_TYPES;
}

export function displayEmoji(entry: Entry): string {
  return entry.emoji || SERIES_TYPES[entry.type].defaultEmoji;
}

export type ThemePreference = "system" | "light" | "dark";
export type SortOrder = "alpha" | "recent";

export interface Settings {
  theme: ThemePreference;
  sort: SortOrder;
}
