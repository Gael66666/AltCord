export const plugin = {
  id: "hide-gifts", name: "Masquer les cadeaux", category: "Apparence",
  description: "Retire les boutons cadeaux de l’interface de discussion.",
  start(AltCord) { AltCord.styles.add("hide-gifts", "[aria-label*=gift i],[aria-label*=cadeau i]{display:none!important}"); return () => AltCord.styles.remove("hide-gifts"); }
};
