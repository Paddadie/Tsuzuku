import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Génère au build les icônes PNG (écran d'accueil iOS, Android, favicon) à partir de
// public/icon.svg, le chapeau de paille. C'est un tracé noir sur fond transparent : on le
// pose sur la couleur « papier » du thème clair (--paper dans src/style.css) pour qu'il
// reste lisible partout.
const background = "#EFE8D8";

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0.1, resizeOptions: { background } },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ["public/icon.svg"],
});
