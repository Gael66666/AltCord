import { plugin as compact } from "./plugins/compact.js";
import { plugin as timestamps } from "./plugins/timestamps.js";
import { plugin as customCss } from "./plugins/custom-css.js";

const waitForRuntime = () => {
  if (!window.AltCord) return setTimeout(waitForRuntime, 20);
  [compact, timestamps, customCss].forEach(plugin => window.AltCord.plugins.register(plugin));
  window.dispatchEvent(new Event("altcord:ready"));
  console.info("[AltCord] loaded", window.AltCord.plugins.list());
};
waitForRuntime();
