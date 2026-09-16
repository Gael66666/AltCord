import { plugin as compact } from "./plugins/compact.js";
import { plugin as timestamps } from "./plugins/timestamps.js";
import { plugin as customCss } from "./plugins/custom-css.js";
import { plugin as hideGifts } from "./plugins/hide-gifts.js";
import { plugin as hideNewBar } from "./plugins/hide-new-bar.js";
import { plugin as hideTyping } from "./plugins/hide-typing.js";
import { plugin as relaxedChat } from "./plugins/relaxed-chat.js";

const waitForRuntime = () => {
  if (!window.AltCord) return setTimeout(waitForRuntime, 20);
  [compact, timestamps, customCss, hideGifts, hideNewBar, hideTyping, relaxedChat]
    .forEach(plugin => window.AltCord.plugins.register(plugin));
  window.dispatchEvent(new Event("altcord:ready"));
  console.info("[AltCord] loaded", window.AltCord.plugins.list());
};
waitForRuntime();
