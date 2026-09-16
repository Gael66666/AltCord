import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join, resolve } from "node:path";
import { desktopStatus, installDesktop, restoreDesktop } from "../desktop/installer.mjs";
const root = resolve(import.meta.dirname, ".."); let mainWindow;
const sendProgress = message => mainWindow?.webContents.send("desktop:progress", message);
function createWindow() { mainWindow = new BrowserWindow({ width: 960, height: 690, minWidth: 780, minHeight: 570, backgroundColor: "#111827", webPreferences: { preload: join(import.meta.dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false } }); mainWindow.setMenuBarVisibility(false); mainWindow.loadFile(join(import.meta.dirname, "index.html")); }
app.whenReady().then(() => { createWindow(); app.on("activate", () => BrowserWindow.getAllWindows().length || createWindow()); }); app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
ipcMain.handle("desktop:status", desktopStatus);
ipcMain.handle("desktop:install", async () => { const answer = await dialog.showMessageBox(mainWindow, { type: "warning", buttons: ["Annuler", "Installer"], defaultId: 0, cancelId: 0, title: "Modifier Discord", message: "Discord doit être complètement fermé.", detail: "AltCord crée d'abord une sauvegarde de app.asar. Vous pourrez restaurer Discord à tout moment." }); return answer.response === 1 ? installDesktop(sendProgress) : { cancelled: true }; });
ipcMain.handle("desktop:restore", async () => { const answer = await dialog.showMessageBox(mainWindow, { type: "warning", buttons: ["Annuler", "Restaurer"], defaultId: 0, cancelId: 0, title: "Restaurer Discord", message: "Discord doit être complètement fermé." }); return answer.response === 1 ? restoreDesktop() : { cancelled: true }; }); ipcMain.handle("app:open-folder", () => shell.openPath(root));
