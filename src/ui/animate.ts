// Petites animations d'interface. Elles sont jouées même si l'appareil demande de réduire
// les animations : choix assumé, elles sont courtes et ne font que souligner une action.

/**
 * Ajoute `className` (qui porte une animation CSS), attend la fin de l'animation puis
 * retire la classe. Le délai maximal garantit la suite même si l'animation ne se lance pas.
 */
export function playCssAnimation(el: HTMLElement, className: string, maxMs = 500): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      window.clearTimeout(timer);
      el.removeEventListener("animationend", onEnd);
      el.classList.remove(className);
      resolve();
    };
    const onEnd = (ev: AnimationEvent): void => {
      if (ev.target === el) done();
    };
    const timer = window.setTimeout(done, maxMs);
    el.addEventListener("animationend", onEnd);
    el.classList.add(className);
  });
}

/** Petit rebond, pour un chiffre qui vient de changer. */
export function bump(el: HTMLElement): void {
  el.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], {
    duration: 320,
    easing: "cubic-bezier(.3, 1.6, .5, 1)",
  });
}

/** Fait monter un petit texte en fondu depuis `anchor` (ex. « +1 » au-dessus du bouton). */
export function floatLabel(anchor: HTMLElement, text: string): void {
  const label = document.createElement("span");
  label.className = "float-label";
  label.setAttribute("aria-hidden", "true");
  label.textContent = text;
  anchor.append(label);
  label
    .animate(
      [
        { opacity: 1, transform: "translate(-50%, 0)" },
        { opacity: 0, transform: "translate(-50%, -30px)" },
      ],
      { duration: 650, easing: "ease-out" },
    )
    .finished.finally(() => label.remove());
}

/** Replie un élément en hauteur et en opacité (ex. carte supprimée). */
export async function collapse(el: HTMLElement): Promise<void> {
  el.style.overflow = "hidden";
  const height = el.offsetHeight;
  await el.animate(
    [
      { height: `${height}px`, opacity: 1, transform: "scale(1)" },
      { height: "0px", opacity: 0, transform: "scale(.96)", marginBottom: "0px", borderWidth: "0px" },
    ],
    { duration: 280, easing: "ease-in", fill: "forwards" },
  ).finished;
}
