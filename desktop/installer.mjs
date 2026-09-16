import { access, copyFile, cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import * as asar from "@electron/asar";

// Electron treats .asar paths as virtual folders by default. The installer
// must access Discord's app.asar as a normal Windows file.
if (process.versions.electron) process.noAsar = true;

const root = resolve(import.meta.dirname, "..");
const marker = "/* AltCord desktop hook v0.1.0 */";
const exists = async path => { try { await access(path, constants.F_OK); return true; } catch { return false; } };
export async function findDiscord() {
  // Electron can be launched without LOCALAPPDATA. Fall back to the user's
  // standard Windows Local AppData path instead of reporting a false negative.
  const roots = [...new Set([process.env.LOCALAPPDATA, join(homedir(), "AppData", "Local")].filter(Boolean))];
  const searched = [];
  for (const root of roots) {
    const base = join(root, "Discord"); searched.push(base); let entries;
    try { entries = await readdir(base, { withFileTypes: true }); } catch { continue; }
    const folders = entries.filter(item => item.isDirectory() && item.name.startsWith("app-")).map(item => item.name).sort().reverse();
    for (const folder of folders) { const target = join(base, folder, "resources", "app.asar"); if (await exists(target)) return target; }
  }
  throw new Error(`Aucune archive app.asar Discord compatible n'a été trouvée. Dossiers vérifiés : ${searched.join(" ; ")}`);
}
const entryCandidates = ["app_bootstrap/index.js", "bundle.js"];
async function archiveEntry(source) {
  for (const candidate of entryCandidates) {
    try { return { path: candidate, source: (await asar.extractFile(source, candidate)).toString("utf8") }; } catch { /* try the next known Discord layout */ }
  }
  return null;
}
async function hasMarker(source) { return Boolean((await archiveEntry(source))?.source.includes(marker)); }
function hook() { return `\n${marker}\n;(() => { const { app } = require("electron"); const fs = require("fs"); const path = require("path"); const runtimePath = path.join(__dirname, "altcord", "altcord.js"); app.on("browser-window-created", (_event, window) => { window.webContents.on("dom-ready", () => { fs.promises.readFile(runtimePath, "utf8").then(script => window.webContents.executeJavaScript(script, true)).catch(error => console.warn("[AltCord] injection failed", error)); }); }); })();\n`; }
export async function desktopStatus() {
  try { const target = await findDiscord(); const backup = `${target}.altcord-backup`; const [patched, backupPresent, targetInfo] = await Promise.all([hasMarker(target), exists(backup), stat(target)]); const backupInfo = backupPresent ? await stat(backup) : null; return { found: true, target, patched, backupPresent, updatedSincePatch: Boolean(backupInfo && targetInfo.mtimeMs > backupInfo.mtimeMs && !patched), versionFolder: target.split("\\").find(item => item.startsWith("app-")) }; }
  catch (error) { return { found: false, error: error.message }; }
}
export async function installDesktop(onProgress = () => {}) {
  const source = await findDiscord(); const backup = `${source}.altcord-backup`; const runtime = join(root, "dist", "altcord.js");
  if (!(await exists(runtime))) throw new Error("Le runtime est absent. Lancez npm run build.");
  if (await hasMarker(source)) return { message: "AltCord est déjà installé.", target: source };
  if (await exists(backup)) throw new Error("Une sauvegarde existe déjà. Utilisez Restaurer, ou vérifiez-la avant de continuer.");
  onProgress("Extraction de l'archive Discord…"); const staging = await mkdtemp(join(tmpdir(), "altcord-")); const extracted = join(staging, "app"); const rebuilt = join(staging, "app.asar");
  try {
    await asar.extractAll(source, extracted);
    // Resolve the small candidate list explicitly because Array.find cannot await.
    let bootstrap = null;
    for (const relative of entryCandidates) { const candidate = join(extracted, ...relative.split("/")); if (await exists(candidate)) { bootstrap = candidate; break; } }
    if (!bootstrap) throw new Error(`Structure Discord inconnue : aucun des fichiers ${entryCandidates.join(" ou ")} n'existe. Rien n'a été modifié.`);
    const original = await readFile(bootstrap, "utf8");
    await mkdir(join(bootstrap, "..", "altcord"), { recursive: true });
    await cp(runtime, join(bootstrap, "..", "altcord", "altcord.js"));
    await writeFile(bootstrap, original + hook());
    onProgress("Création de la nouvelle archive…"); await asar.createPackage(extracted, rebuilt);
    onProgress("Sauvegarde de Discord…"); await copyFile(source, backup); await rename(rebuilt, source);
    return { message: "AltCord est installé. Vous pouvez démarrer Discord.", target: source };
  }
  catch (error) { if (await exists(backup) && !(await hasMarker(source))) await rm(backup, { force: true }); throw error; }
  finally { await rm(staging, { recursive: true, force: true }); }
}
export async function restoreDesktop() { const source = await findDiscord(); const backup = `${source}.altcord-backup`; if (!(await exists(backup))) throw new Error("Aucune sauvegarde AltCord n'a été trouvée."); const retired = `${source}.altcord-removing`; await rename(source, retired); try { await rename(backup, source); } catch (error) { await rename(retired, source); throw error; } await rm(retired, { force: true }); return { message: "Discord a été restauré dans son état d'origine.", target: source }; }
