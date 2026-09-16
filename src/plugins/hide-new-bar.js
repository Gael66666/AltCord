export const plugin = {
  id: "hide-new-bar", name: "Masquer la barre de nouveaux messages", category: "Chat",
  description: "Cache la barre qui indique les nouveaux messages non lus.",
  start(AltCord) { AltCord.styles.add("hide-new-bar", "[class*=newMessagesBar]{display:none!important}"); return () => AltCord.styles.remove("hide-new-bar"); }
};
