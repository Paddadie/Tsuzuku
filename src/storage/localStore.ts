// Accès bas niveau à localStorage. Les erreurs du navigateur (stockage désactivé,
// quota plein…) ne remontent pas en exception : lecture → null, écriture → false.

export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Rien à faire : la clé restera simplement en place.
  }
}

/** Clés enregistrées qui commencent par `prefix`. */
export function keysStartingWith(prefix: string): string[] {
  try {
    return Object.keys(localStorage).filter((key) => key.startsWith(prefix));
  } catch {
    return [];
  }
}

/**
 * Demande au navigateur de ne pas effacer le stockage de lui-même (manque de place,
 * site non visité depuis longtemps dans Safari). Sans effet si ce n'est pas pris en charge.
 */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {});
}

/** Renvoie undefined si le texte n'est pas du JSON valide. */
export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
