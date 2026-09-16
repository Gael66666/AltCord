export const plugin = {
  id: "timestamps",
  name: "Heure locale",
  category: "Chat",
  description: "Ajoute une heure lisible à côté des messages chargés.",
  start() {
    const decorate = root => root.querySelectorAll?.("time[datetime]").forEach(time => {
      if (time.dataset.altcordTimestamp) return;
      const date = new Date(time.dateTime); if (Number.isNaN(date.valueOf())) return;
      const label = document.createElement("span"); label.className = "altcord-timestamp"; label.textContent = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      time.dataset.altcordTimestamp = "1"; time.after(label);
    });
    decorate(document); const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => node.nodeType === 1 && decorate(node))));
    observer.observe(document.body, { childList: true, subtree: true }); return () => { observer.disconnect(); document.querySelectorAll(".altcord-timestamp").forEach(node => node.remove()); document.querySelectorAll("time[data-altcord-timestamp]").forEach(node => delete node.dataset.altcordTimestamp); };
  }
};
