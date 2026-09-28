import type { Entry, Settings } from "../types";
import {
  deleteBackups,
  isFromNewerVersion,
  parseEntries,
  readBackups,
  toExportJson,
  type Backup,
} from "../storage/entriesRepo";
import { isSortOrder, isThemePreference } from "../storage/settingsRepo";
import { parseJson } from "../storage/localStore";
import { $, radioValue, setRadioValue } from "../ui/dom";
import { confirmDialog } from "../ui/confirm";
import { capitalize, plural } from "../ui/format";
import { toast } from "../ui/toast";

export interface SettingsViewDeps {
  getEntries(): Entry[];
  /** Renvoie false si la nouvelle liste n'a pas pu être enregistrée (l'erreur est déjà signalée). */
  replaceEntries(entries: Entry[]): boolean;
  onSettingsChange(settings: Settings): void;
}

export interface SettingsView {
  /** À appeler à chaque ouverture de la page (met à jour le résumé des données). */
  refresh(): void;
}

export function initSettingsView(initial: Settings, deps: SettingsViewDeps): SettingsView {
  const form = $<HTMLFormElement>("settingsForm");
  const fileInput = $<HTMLInputElement>("importFile");

  setRadioValue(form, "theme", initial.theme);
  setRadioValue(form, "sort", initial.sort);
  $("appVersion").textContent = `Version ${__APP_VERSION__}`;

  form.addEventListener("change", () => {
    const theme = radioValue(form, "theme");
    const sort = radioValue(form, "sort");
    if (isThemePreference(theme) && isSortOrder(sort)) deps.onSettingsChange({ theme, sort });
  });

  $("exportBtn").addEventListener("click", () => void saveFiles([entriesFile(deps.getEntries())]));
  $("importBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = ""; // permet de réimporter le même fichier
    if (file) await importEntries(file, deps);
  });

  $("exportBackupBtn").addEventListener("click", () => void saveFiles(readBackups().map(backupFile)));
  $("deleteBackupBtn").addEventListener("click", async () => {
    const n = readBackups().length;
    const confirmed = await confirmDialog({
      title: n === 1 ? "Supprimer la copie de secours ?" : `Supprimer les ${n} copies de secours ?`,
      message: "Pense à l’exporter avant si tu veux la conserver : la suppression est définitive.",
      confirmLabel: "Supprimer",
    });
    if (!confirmed) return;
    deleteBackups();
    refresh();
    toast(n === 1 ? "Copie de secours supprimée." : "Copies de secours supprimées.");
  });

  function refresh(): void {
    const n = deps.getEntries().length;
    $("dataSummary").textContent =
      n === 0
        ? "Aucune œuvre enregistrée sur cet appareil."
        : `${n} ${plural(n, "œuvre")} ${plural(n, "enregistrée")} sur cet appareil.`;

    // Copies de données illisibles mises de côté au démarrage : seul moyen de les récupérer
    // sur iPhone, où l'on n'a pas accès aux outils de développement.
    const backups = readBackups().length;
    $("backupArea").hidden = backups === 0;
    $("backupSummary").textContent =
      backups === 1
        ? "Des données illisibles ont été mises de côté sur cet appareil. Exporte la copie de secours pour la conserver, puis supprime-la."
        : `${backups} copies de données illisibles ont été mises de côté sur cet appareil. Exporte-les pour les conserver, puis supprime-les.`;
    $("exportBackupBtn").textContent =
      backups === 1 ? "Exporter la copie de secours" : "Exporter les copies de secours";
    $("deleteBackupBtn").textContent =
      backups === 1 ? "Supprimer la copie de secours" : "Supprimer les copies de secours";
  }

  return { refresh };
}

function entriesFile(entries: Entry[]): File {
  const date = new Date().toISOString().slice(0, 10);
  return new File([toExportJson(entries)], `tsuzuku-${date}.json`, { type: "application/json" });
}

function backupFile(backup: Backup): File {
  // 2026-09-28T12:03:04.123Z → 2026-09-28T12-03-04 (les « : » sont refusés dans les noms de fichiers).
  const stamp = backup.savedAt ? backup.savedAt.slice(0, 19).replaceAll(":", "-") : "ancienne";
  return new File([backup.raw], `tsuzuku-secours-${stamp}.json`, { type: "application/json" });
}

async function saveFiles(files: File[]): Promise<void> {
  // Sur mobile, le partage natif est le seul moyen fiable d'enregistrer un fichier
  // depuis une app installée sur l'écran d'accueil iOS (« Enregistrer dans Fichiers »).
  // Sur ordinateur, un téléchargement classique est plus naturel.
  if (window.matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) toast("L’export a échoué.");
    }
    return;
  }

  for (const file of files) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function importEntries(file: File, deps: SettingsViewDeps): Promise<void> {
  const data = parseJson(await file.text());
  const imported = parseEntries(data);
  if (!imported) {
    toast(
      isFromNewerVersion(data)
        ? "Cette sauvegarde vient d’une version plus récente de Tsuzuku : mets l’app à jour, puis réessaie."
        : "Ce fichier n’est pas une sauvegarde Tsuzuku valide.",
    );
    return;
  }

  const current = deps.getEntries().length;
  const currentLabel = current === 1 ? "ton œuvre actuelle" : `tes ${current} œuvres actuelles`;
  if (imported.length === 0) {
    // Une sauvegarde vide est acceptée (elle permet de repartir de zéro), mais on le dit clairement.
    if (current === 0) {
      toast("Ce fichier ne contient aucune œuvre.");
      return;
    }
    const confirmed = await confirmDialog({
      title: "Vider ta liste ?",
      message: `Ce fichier ne contient aucune œuvre : l’importer effacera ${currentLabel}.`,
      confirmLabel: "Vider la liste",
    });
    if (!confirmed) return;
  } else if (current > 0) {
    const confirmed = await confirmDialog({
      title: "Remplacer ta liste ?",
      message: `${capitalize(currentLabel)} ${current === 1 ? "sera remplacée" : "seront remplacées"} par ${imported.length === 1 ? "l’œuvre" : `les ${imported.length} œuvres`} du fichier.`,
      confirmLabel: "Remplacer",
    });
    if (!confirmed) return;
  }

  if (!deps.replaceEntries(imported)) return;
  toast(
    imported.length === 0
      ? "Liste vidée."
      : `${imported.length} ${plural(imported.length, "œuvre")} ${plural(imported.length, "importée")}.`,
  );
}
