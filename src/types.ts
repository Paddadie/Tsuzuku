export type SeriesType = "manga" | "anime" | "tv";

export interface Entry {
  id: string;
  title: string;
  type: SeriesType;
  /** Chapitre (manga) ou épisode (anime, série) en cours. */
  progress: number;
  /** Saison en cours, null pour un suivi sans saison (manga, anime en épisodes seuls). */
  season: number | null;
  /** Emoji choisi, ou chaîne vide pour utiliser l'emoji par défaut du type. */
  emoji: string;
  /**
   * Timestamp (ms) de la dernière progression (chapitre, épisode ou saison), utilisé par le
   * tri « Récents ». Changer le titre, l'emoji ou le type ne le modifie pas.
   */
  updatedAt: number;
}

/**
 * Suivi par saison : jamais, au choix dans la fiche (champ « Suivi » : épisodes seuls ou
 * saison + épisode), ou toujours.
 */
export type SeasonTracking = "never" | "optional" | "always";

interface SeriesTypeInfo {
  plural: string;
  unit: string;
  defaultEmoji: string;
  seasons: SeasonTracking;
}

// Tout ce qui varie selon le type de série. Ajouter un type = ajouter une entrée ici, ses
// couleurs dans style.css et son bouton radio dans index.html. L'ordre des entrées est celui
// des sections de la liste.
export const SERIES_TYPES: Record<SeriesType, SeriesTypeInfo> = {
  manga: { plural: "Mangas", unit: "chapitre", defaultEmoji: "📖", seasons: "never" },
  anime: { plural: "Animes", unit: "épisode", defaultEmoji: "📺", seasons: "optional" },
  tv: { plural: "Séries", unit: "épisode", defaultEmoji: "🎬", seasons: "always" },
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
