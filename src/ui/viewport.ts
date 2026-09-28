// Contournement d'un défaut d'iOS pour l'app installée sur l'écran d'accueil, avec une barre
// d'état translucide (« black-translucent », index.html) : la page commence tout en haut de
// l'écran, mais iOS lui donne une hauteur réduite de celle de la barre d'état. Il reste
// alors une bande vide en bas, où la liste est coupée net, et la liste devient défilable
// alors que tout tient à l'écran.
// L'app installée occupe tout l'écran : l'écart entre la hauteur de l'écran et celle de la
// page est exposé en CSS (--viewport-gap) pour étendre la page, la page Réglages et la sheet
// jusqu'en bas. Sans ce défaut, l'écart vaut 0.

/** Vrai seulement pour l'app ajoutée à l'écran d'accueil sur iPhone / iPad. */
const isIosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function fitIosStandaloneViewport(): void {
  if (!isIosStandalone) return;
  const landscape = window.matchMedia("(orientation: landscape)");

  const update = (): void => {
    // screen.width / height ne s'échangent pas quand on tourne l'iPhone.
    const screenHeight = landscape.matches
      ? Math.min(screen.width, screen.height)
      : Math.max(screen.width, screen.height);
    const gap = Math.max(0, screenHeight - window.innerHeight);
    document.documentElement.style.setProperty("--viewport-gap", `${gap}px`);
  };

  update();
  // Rotation de l'écran. On ignore les redimensionnements pendant une saisie : le clavier
  // ne doit pas être compté dans l'écart.
  window.addEventListener("resize", () => {
    if (!(document.activeElement instanceof HTMLInputElement)) update();
  });
}
