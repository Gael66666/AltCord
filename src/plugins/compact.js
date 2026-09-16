export const plugin = {
  id: "compact",
  name: "Messages compacts",
  category: "Apparence",
  description: "Réduit l'espacement vertical entre les messages.",
  start(AltCord) { AltCord.styles.add("compact", ".altcord-compact [class*=messageListItem]{padding-top:2px!important;padding-bottom:2px!important}"); document.documentElement.classList.add("altcord-compact"); return () => { document.documentElement.classList.remove("altcord-compact"); AltCord.styles.remove("compact"); }; }
};
