import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

// ⚠️ Doit correspondre exactement au nom de ton repo GitHub pour que
// GitHub Pages serve les fichiers au bon chemin (https://<toi>.github.io/<repo>/).
const REPO_NAME = "Tsuzuku";

// Couleur du fond sombre (--paper dans src/style.css), utilisée pour l'écran de lancement.
const PAPER_DARK = "#1A1611";

export default defineConfig({
  base: `/${REPO_NAME}/`,

  // Version affichée dans les Réglages (À propos).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  plugins: [
    VitePWA({
      registerType: "prompt", // on gère nous-mêmes le bandeau "Mettre à jour"
      injectRegister: false, // enregistrement fait à la main dans src/pwa/updatePrompt.ts
      // Icônes PNG générées au build d'après pwa-assets.config.ts, ajoutées au manifest
      // et aux balises <link> d'index.html.
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
        injectThemeColor: false, // index.html a déjà sa balise, mise à jour selon le thème
      },
      manifest: {
        lang: "fr",
        name: "Tsuzuku",
        short_name: "Tsuzuku",
        description: "Suivi de mangas et animes en cours.",
        theme_color: PAPER_DARK,
        background_color: PAPER_DARK,
        display: "standalone",
        start_url: `/${REPO_NAME}/`,
        scope: `/${REPO_NAME}/`,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
