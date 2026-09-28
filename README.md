# Tsuzuku (続く)

Suivi de mangas et animes en cours. Liste, ajout, modification et suppression, 100% local (`localStorage`) : aucune donnée n'est envoyée nulle part, et l'app fonctionne hors ligne une fois installée.

## Structure

```
index.html                     page unique : liste, réglages, sheet d'ajout/modification
pwa-assets.config.ts           génération des icônes PNG à partir de public/icon.svg
src/main.ts                    état, rendu de la liste, câblage et démarrage
src/entryForm.ts               sheet d'ajout / modification d'une série (<dialog>)
src/types.ts                   types partagés + infos par type de série (libellés, emoji par défaut)
src/emoji.ts                   validation « un seul emoji »
src/style.css                  style (thème sombre + variante claire)
src/storage/localStore.ts      accès bas niveau à localStorage (erreurs absorbées)
src/storage/entriesRepo.ts     lecture/écriture/validation de la liste, format d'export
src/storage/settingsRepo.ts    réglages (thème, tri)
src/settings/settingsView.ts   page Réglages : thème, tri, export/import, version
src/settings/theme.ts          application du thème (clair / sombre / système)
src/ui/                        petits utilitaires : DOM, animations, toast, pop-up de confirmation, textes, hauteur d'écran iOS
src/env.d.ts                   version de l'app injectée au build
src/pwa/updatePrompt.ts(.css)  bandeau « Nouvelle version disponible »
public/icon.svg                icône : chapeau de paille (tracé noir, fond transparent)
vite.config.ts                 build + config PWA (manifest, service worker, icônes)
.github/workflows/deploy.yml   build + déploiement auto sur push vers main
```

## Développer en local

```bash
npm install
npm run dev
npm run format    # remet en forme tout le projet (Prettier)
```

## Build de production

```bash
npm run build     # tsc puis vite build → dossier dist/ (icônes PNG générées au passage)
npm run preview   # sert dist/ localement pour vérifier avant de pousser
```

## Déployer sur GitHub Pages

1. **Avant de pousser** : dans `vite.config.ts`, vérifie que `REPO_NAME` correspond exactement au nom de ton repo GitHub (sinon les chemins des fichiers seront faux une fois en ligne)
2. Pousse ce dossier sur la branche `main` de ton repo
3. Repo → **Settings** → **Pages** → Source : **GitHub Actions**
4. Le premier push déclenche `.github/workflows/deploy.yml` : build + publication automatique
5. Chaque push suivant sur `main` redéploie automatiquement, et les visiteurs qui ont déjà l'app ouverte reçoivent un bandeau **« Nouvelle version disponible »** (grâce au service worker généré par `vite-plugin-pwa`) plutôt qu'une mise à jour silencieuse (la vérification se fait au lancement et à chaque retour de l'app au premier plan)

Ton app sera accessible à `https://<utilisateur>.github.io/<repo>/` (ici : `https://paddadie.github.io/Tsuzuku/`).

## Sur iPhone

Une fois l'URL GitHub Pages ouverte dans **Safari** :

1. Icône de partage → **« Sur l'écran d'accueil »**
2. L'app s'ouvre ensuite en plein écran, sans barre Safari

⚠️ Safari et l'app installée sur l'écran d'accueil ont **des stockages séparés** : les séries saisies dans l'un n'apparaissent pas dans l'autre. Utilise **Réglages → Exporter / Importer une sauvegarde** pour passer de l'un à l'autre ou changer d'appareil.

## Notes

- Thème : **Système** par défaut (suit le mode clair/sombre de l'appareil), forçable en clair ou sombre dans les Réglages.
- Liste groupée par type (mangas puis animes), triée par ordre alphabétique ou par dernière progression (réglage).
- Un anime peut se suivre en épisodes seuls ou en saison + épisode (choix « Suivi » dans le formulaire).
- Les petites animations d'interface sont jouées même si l'appareil demande de réduire les animations.
- Les titres trop longs passent sur deux lignes, puis sont coupés par « … ».
- Les données vivent uniquement dans le navigateur qui ouvre la page : pas de synchronisation entre appareils, d'où l'export/import.
- Si les données enregistrées deviennent illisibles, elles ne sont jamais effacées : une copie de secours est mise de côté et apparaît dans **Réglages → Données**, d'où on peut l'exporter.
- Réglages → À propos affiche la version de `package.json` : augmente-la à chaque déploiement pour pouvoir vérifier sur le téléphone que la mise à jour est bien arrivée.
- Icônes : `public/icon.svg` est la source unique. Les PNG (écran d'accueil iOS, Android, favicon) sont générés à chaque build, sur fond `#EFE8D8`, d'après `pwa-assets.config.ts`.
