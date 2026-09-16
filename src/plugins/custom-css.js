export const plugin = {
  id: "custom-css",
  name: "CSS personnel",
  category: "Apparence",
  description: "Applique le CSS enregistré dans la console AltCord.",
  start(AltCord) { const css = AltCord.settings.get("custom-css", "css", ""); if (css) AltCord.styles.add("custom-css", css); return () => AltCord.styles.remove("custom-css"); }
};
