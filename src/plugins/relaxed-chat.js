export const plugin = {
  id: "relaxed-chat", name: "Discussion aérée", category: "Apparence",
  description: "Augmente légèrement l’espacement et la lisibilité des messages.",
  start(AltCord) { AltCord.styles.add("relaxed-chat", "[class*=messageListItem]{margin:3px 0!important}[class*=markup]{line-height:1.55!important}"); return () => AltCord.styles.remove("relaxed-chat"); }
};
