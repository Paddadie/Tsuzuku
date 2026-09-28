/** Accorde un mot au pluriel (règle simple en « s », suffisante pour les libellés de l'app). */
export function plural(n: number, word: string): string {
  return n > 1 ? `${word}s` : word;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
