import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");
const runtime = await read("src/runtime.js");
const plugins = await Promise.all(["compact", "timestamps", "custom-css", "hide-typing", "hide-gifts", "hide-new-bar", "relaxed-chat"].map(name => read(`src/plugins/${name}.js`)));
const pluginCode = plugins.map(source => source.replace("export const plugin =", "const plugin =").replace(/const plugin =/g, "window.AltCord.plugins.register(").replace(/\n};\s*$/, "\n});")).join("\n");
const bundle = `${runtime}\n${pluginCode}\nwindow.dispatchEvent(new Event("altcord:ready"));\n`;
await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(resolve(root, "dist/altcord.js"), bundle);
await rm(resolve(root, "browser/dist"), { recursive: true, force: true });
await cp(resolve(root, "dist"), resolve(root, "browser/dist"), { recursive: true });
console.log("Built dist/altcord.js and browser/dist/altcord.js");
