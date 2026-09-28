const graphemes = new Intl.Segmenter("fr", { granularity: "grapheme" });

// Pictogramme, drapeau (paire d'indicateurs régionaux) ou keycap (1️⃣, se termine par U+20E3).
const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

/**
 * Vrai si la chaîne est exactement un emoji. On compte en graphèmes et non en
 * caractères : 👨‍👩‍👧 ou 🏴‍☠️ font plusieurs unités UTF-16 mais un seul emoji.
 */
export function isSingleEmoji(value: string): boolean {
  let count = 0;
  for (const _ of graphemes.segment(value)) {
    if (++count > 1) return false;
  }
  return count === 1 && EMOJI_PATTERN.test(value);
}
