export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Élément #${id} introuvable`);
  return el as T;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Valeur sélectionnée d'un groupe de boutons radio d'un formulaire. */
export function radioValue(form: HTMLFormElement, name: string): string {
  return (form.elements.namedItem(name) as RadioNodeList).value;
}

export function setRadioValue(form: HTMLFormElement, name: string, value: string): void {
  (form.elements.namedItem(name) as RadioNodeList).value = value;
}
