export const plugin = {
  id: "hide-typing", name: "Masquer l’indicateur de saisie", category: "Chat",
  description: "Cache le texte indiquant qu’une personne est en train d’écrire.",
  start(AltCord) { AltCord.styles.add("hide-typing", "[class*=typing]{display:none!important}"); return () => AltCord.styles.remove("hide-typing"); }
};
