const $ = selector => document.querySelector(selector);
const progress = message => $("#progress").textContent = message || "";
async function refresh() {
  progress("Analyse de Discord…"); const status = await window.altcordDesktop.status(); const badge = $("#statusBadge");
  if (!status.found) { $("#stateTitle").textContent = "Discord Stable est introuvable"; $("#stateDescription").textContent = status.error; $("#targetPath").textContent = "—"; badge.textContent = "Non détecté"; badge.className = "badge warn"; $("#installButton").disabled = true; $("#restoreButton").disabled = true; progress("Ferme puis relance AltCord après une mise à jour."); return; }
  $("#targetPath").textContent = status.target; $("#installButton").disabled = false; $("#restoreButton").disabled = !status.backupPresent;
  if (status.patched) { $("#stateTitle").textContent = "AltCord est actif"; $("#stateDescription").textContent = "Le panneau ◈ sera visible dans Discord après son démarrage."; badge.textContent = "Actif"; badge.className = "badge good"; }
  else if (status.updatedSincePatch) { $("#stateTitle").textContent = "Discord a été mis à jour"; $("#stateDescription").textContent = "La mise à jour a retiré AltCord. Une nouvelle installation est nécessaire."; badge.textContent = "Réinstaller"; badge.className = "badge warn"; }
  else { $("#stateTitle").textContent = "Prêt à installer"; $("#stateDescription").textContent = "AltCord créera une sauvegarde de l’archive Discord avant l’installation."; badge.textContent = "Prêt"; badge.className = "badge"; }
  progress("");
}
async function run(action) { try { progress(action === "install" ? "Préparation de l’installation…" : "Restauration…"); const result = await window.altcordDesktop[action](); if (!result.cancelled) progress(result.message); await refresh(); } catch (error) { progress(`Erreur : ${error.message}`); } }
$("#installButton").onclick = () => run("install"); $("#restoreButton").onclick = () => run("restore"); $("#refreshButton").onclick = refresh; $("#folderButton").onclick = () => window.altcordDesktop.openFolder(); window.altcordDesktop.onProgress(progress); refresh();
