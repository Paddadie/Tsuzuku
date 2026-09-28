import type { Entry, SeasonTracking } from "../types";
import { SERIES_TYPES, isSeriesType } from "../types";
import { isSingleEmoji } from "../emoji";
import { isRecord, keysStartingWith, parseJson, readItem, removeItem, writeItem } from "./localStore";

const ENTRIES_KEY = "tsuzuku:entries";
// Copies de secours d'un contenu illisible, pour ne jamais perdre de données en silence.
// Une clé par copie, suffixée de sa date (`tsuzuku:entries:backup:2026-09-28T…`) :
// une nouvelle copie n'écrase jamais la précédente. La clé sans suffixe est l'ancien format.
const BACKUP_KEY = "tsuzuku:entries:backup";

// Format stocké et exporté : { version, entries }. À incrémenter si le format change,
// en ajoutant la migration correspondante dans parseEntries.
// v1 → v2 : ajout de `season` (absent = suivi en épisodes seuls).
// v2 → v3 : ajout du type "tv" (séries). Rien à migrer, mais une version de l'app qui ne
// connaît pas ce type refusera ainsi clairement une sauvegarde qui en contient.
const SCHEMA_VERSION = 3;

export interface LoadedEntries {
  entries: Entry[];
  /** Vrai si le contenu stocké était illisible (il a été mis de côté, voir readBackups). */
  recovered: boolean;
}

export interface Backup {
  /** Date de la mise de côté (ISO), vide pour une copie de l'ancien format. */
  savedAt: string;
  /** Contenu tel qu'il était stocké. */
  raw: string;
}

export function readEntries(): LoadedEntries {
  const raw = readItem(ENTRIES_KEY);
  if (raw === null) return { entries: [], recovered: false };

  const entries = parseEntries(parseJson(raw));
  if (entries) return { entries, recovered: false };

  // Le contenu illisible reste sous ENTRIES_KEY jusqu'à la prochaine modification : sans ce
  // test, chaque lancement d'ici là en ferait une nouvelle copie identique.
  if (!readBackups().some((b) => b.raw === raw)) {
    const saved = writeItem(`${BACKUP_KEY}:${new Date().toISOString()}`, raw);
    if (saved) console.error(`Contenu de "${ENTRIES_KEY}" illisible, mis de côté.`);
    else console.error(`Contenu de "${ENTRIES_KEY}" illisible, et impossible de le mettre de côté.`);
  }
  return { entries: [], recovered: true };
}

export function writeEntries(entries: Entry[]): boolean {
  return writeItem(ENTRIES_KEY, JSON.stringify({ version: SCHEMA_VERSION, entries }));
}

/** Copies de secours, de la plus ancienne à la plus récente. */
export function readBackups(): Backup[] {
  return backupKeys()
    .sort()
    .flatMap((key) => {
      const raw = readItem(key);
      return raw === null ? [] : [{ savedAt: key.slice(BACKUP_KEY.length + 1), raw }];
    });
}

export function deleteBackups(): void {
  backupKeys().forEach(removeItem);
}

function backupKeys(): string[] {
  return keysStartingWith(BACKUP_KEY).filter((key) => key === BACKUP_KEY || key.startsWith(`${BACKUP_KEY}:`));
}

export function toExportJson(entries: Entry[]): string {
  return JSON.stringify(
    { app: "tsuzuku", version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), entries },
    null,
    2,
  );
}

/** Vrai si les données viennent d'une version de l'app plus récente que celle-ci. */
export function isFromNewerVersion(value: unknown): boolean {
  return isRecord(value) && typeof value.version === "number" && value.version > SCHEMA_VERSION;
}

/**
 * Valide et normalise des données venues du stockage ou d'un fichier importé.
 * Accepte le format actuel, la v1 (sans season) et le tout premier format (tableau brut,
 * sans updatedAt).
 * Renvoie null si le contenu n'est pas exploitable.
 */
export function parseEntries(value: unknown): Entry[] | null {
  const list = Array.isArray(value)
    ? value
    : isRecord(value) && typeof value.version === "number" && value.version <= SCHEMA_VERSION
      ? value.entries
      : null;
  if (!Array.isArray(list)) return null;

  const entries: Entry[] = [];
  for (const item of list) {
    const entry = toEntry(item);
    if (!entry) return null;
    entries.push(entry);
  }

  const ids = new Set(entries.map((e) => e.id));
  return ids.size === entries.length ? entries : null;
}

function toEntry(value: unknown): Entry | null {
  if (!isRecord(value)) return null;
  const { id, title, type, progress, season, emoji, updatedAt } = value;
  if (typeof id !== "string" || !id) return null;
  if (typeof title !== "string" || !title.trim()) return null;
  if (!isSeriesType(type)) return null;
  if (!isCount(progress)) return null;

  return {
    id,
    title: title.trim(),
    type,
    // On compte à partir de 1 (chapitre, épisode, saison) : d'anciennes données à 0 sont remontées à 1.
    progress: Math.max(1, progress),
    season: toSeason(SERIES_TYPES[type].seasons, season),
    // Un emoji invalide n'empêche pas l'import : on retombe sur l'emoji par défaut.
    emoji: typeof emoji === "string" && isSingleEmoji(emoji) ? emoji : "",
    updatedAt: typeof updatedAt === "number" && Number.isFinite(updatedAt) ? updatedAt : 0,
  };
}

/**
 * Saison selon le suivi du type : jamais de saison, saison facultative (sans saison valide,
 * suivi en épisodes seuls) ou saison obligatoire (sans saison valide, saison 1).
 */
function toSeason(tracking: SeasonTracking, season: unknown): number | null {
  if (tracking === "never") return null;
  if (isCount(season)) return Math.max(1, season);
  return tracking === "always" ? 1 : null;
}

/** Entier positif ou nul (0 est accepté pour les anciennes données, puis remonté à 1). */
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
