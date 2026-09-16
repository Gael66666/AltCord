import { createInterface } from "node:readline/promises";
import { desktopStatus, installDesktop, restoreDesktop } from "./installer.mjs";
async function confirm(question) { const rl = createInterface({ input: process.stdin, output: process.stdout }); const answer = await rl.question(`${question} [y/N] `); rl.close(); return /^y(es)?$/i.test(answer.trim()); }
const action = process.argv[2];
if (!action || !["install", "restore", "status"].includes(action)) { console.error("Usage: node desktop/patcher.mjs <install|restore|status>"); process.exitCode = 1; }
else try { if (action === "status") console.log(await desktopStatus()); else if (await confirm("Discord doit être fermé. Continuer ?")) console.log(await (action === "install" ? installDesktop(console.log) : restoreDesktop())); else console.log("Annulé."); } catch (error) { console.error(`AltCord: ${error.message}`); process.exitCode = 1; }
