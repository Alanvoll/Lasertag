// Маршрутизация по хэшу и обработка всех кликов.
"use strict";
const app = document.getElementById("app");
let DEPTH = 0, LAST = null, rTimer = null;
function parse(h) {
  h = (h || "").replace(/^#/, "") || "season";
  let m;
  if ((m = h.match(/^game-(\d{4}-\d{2}-\d{2})(?:-(players|duels|awards))?$/))) return { pg: "game", key: "game-" + m[1], tab: m[2] || "sum", nav: "games" };
  if ((m = h.match(/^replay-(\d{4}-\d{2}-\d{2})$/))) return { pg: "replay", date: m[1], nav: "games" };
  if (h.startsWith("player-")) {
    const rest = h.slice(7), t = rest.match(/^(.+)-(games|guns|duels|compare)$/);
    if (t && BYSLUG.has(t[1])) return { pg: "player", slug: t[1], tab: t[2], nav: "players" };
    return { pg: "player", slug: rest, tab: "", nav: "players" };
  }
  if (h.startsWith("gun-")) return { pg: "guns", slug: h.slice(4), nav: "guns" };
  if (["season", "games", "players", "guns", "spread"].includes(h)) return { pg: h, nav: h === "spread" ? "players" : h };
  return { pg: "season", nav: "season" };
}
function titleOf(r) {
  if (r.pg === "game") { const x = gameByKey(r.key); return x ? `Игра ${dd(x.date)}` : "Игры"; }
  if (r.pg === "player") { const s = BYSLUG.get(r.slug); return s ? s.name : "Игроки"; }
  if (r.pg === "guns" && r.slug) { const g = GUNSLUG.get(r.slug); return g ? g.name : "Пушки"; }
  return { season: "Сезон", games: "Игры", players: "Игроки", guns: "Пушки", spread: "Разброс по играм", replay: "Повтор боя" }[r.pg] || "Лазертаг";
}
function render(calm) {
  const r = parse(location.hash);
  let html;
  try {
    html = r.pg === "game" ? pageGame(r.key, r.tab) : r.pg === "replay" ? pageReplay(r.date) : r.pg === "player" ? pagePlayer(r.slug, r.tab)
      : r.pg === "guns" ? pageGuns(r.slug) : r.pg === "games" ? pageGames() : r.pg === "players" ? pagePlayers() : r.pg === "spread" ? pageSpread() : pageSeason();
  } catch (e) { console.error(e); html = `<div class="empty">Ошибка: ${esc(e.message)}</div>`; }
  const y = window.scrollY;
  app.className = calm ? "calm" : "";
  app.innerHTML = navBar(r.nav) + `<main>${html}</main>` + tabBar(r.nav) + pickSheet();
  document.title = titleOf(r) + " · Лазертаг";
  window.scrollTo(0, calm ? y : 0);
  clearInterval(rTimer);
  const f = document.getElementById("rframe");
  if (f) { const fit = () => { try { const d = f.contentDocument; if (d && d.documentElement) { const h = d.documentElement.scrollHeight; if (h > 300) f.style.height = h + "px"; } } catch (_) {} }; f.addEventListener("load", fit); rTimer = setInterval(fit, 1000); }
}
const toggleSort = (o, k, defDir = -1) => { if (o.k === k) o.dir = -o.dir; else { o.k = k; o.dir = k === "name" ? 1 : defDir; } };
const curGameKey = () => { const r = parse(location.hash); return r.pg === "game" ? r.key : null; };
const ACT = {
  meMenu: () => { ST.meOpen = !ST.meOpen; },
  meClose: () => { ST.meOpen = false; return "nav"; },
  meSet: v => { ME = v || null; ST.meOpen = false; try { v ? localStorage.setItem("lt-me", v) : localStorage.removeItem("lt-me"); } catch (_) {} if (v) { location.hash = plHref(v); return "nav"; } },
  gFilter: v => { ST.gFilter = v; },
  gMode: v => { ST.gMode = v; },
  gSort: v => { toggleSort(ST.gSort, v); },
  gExp: v => { ST.gExp = ST.gExp === v ? null : v; },
  gFrags: () => { ST.gFrags = !ST.gFrags; if (!ST.gFrags && ST.gSort.k === "frag") ST.gSort = { k: "mvp", dir: -1 }; },
  gHelp: () => { ST.gHelp = !ST.gHelp; },
  dPick: v => { const k = curGameKey(); if (k) ST.dPick[k] = v; },
  dPickGo: v => { const k = curGameKey(); if (k) ST.dPick[k] = v; return "nav"; },
  dSort: v => { toggleSort(ST.dSort, v); },
  mxSwap: () => { ST.mxSwap = !ST.mxSwap; },
  aPick: v => { const k = curGameKey(); if (k) ST.aPick[k] = +v; },
  noteOpen: () => { ST.noteOpen = !ST.noteOpen; },
  sNom: v => { ST.sNom = v; },
  sNomAll: () => { ST.sNomAll = !ST.sNomAll; },
  pairs: v => { ST.pairs = v; },
  pairsAll: () => { ST.pairsAll = !ST.pairsAll; ST.pairs = "pairs"; },
  pairsWho: v => { ST.pairsWho = v; },
  plMode: v => { ST.plMode = v; },
  plLoc: v => { ST.plLoc = v; ST.plMore = false; },
  plMin: v => { ST.plMin = +v || 1; ST.plMore = false; },
  plCls: v => { ST.plCls = v; if (v !== "all" && ["rating", "mvps", "best", "alive"].includes(ST.plSort.k)) ST.plSort = { k: "dealt", dir: -1 }; },
  plSort: v => { toggleSort(ST.plSort, v); },
  plMore: () => { ST.plMore = !ST.plMore; },
  plHelp: () => { ST.plHelp = !ST.plHelp; },
  cmpSlot: v => { ST.cmpSlot = v; },
  cmpSwap: () => { const [a, b] = cmpNow(); ST.cmpA = b; ST.cmpB = a; },
  cmpPick: v => { const r = parse(location.hash); const [a, b] = cmpNow();
    if (r.pg === "player") { ST.cmpB = v; return; }
    if ((ST.cmpSlot || "B") === "A") { if (v === b) ST.cmpB = a; ST.cmpA = v; ST.cmpSlot = "B"; } else { if (v === a) ST.cmpA = b; ST.cmpB = v; ST.cmpSlot = "A"; } },
  sheet: v => { ST.sheet = v; },
  sheetClose: () => { ST.sheet = null; },
  sheetPick: v => { const [a, b] = cmpNow(), r = parse(location.hash);
    if (ST.sheet === "A" && r.pg !== "player") { if (v === b) ST.cmpB = a; ST.cmpA = v; } else { if (r.pg !== "player" && v === a) ST.cmpA = b; ST.cmpB = v; } ST.sheet = null; },
  pgMetric: v => { ST.pg.metric = v; },
  pgView: v => { ST.pg.view = v; },
  awPick: v => { ST.awPick = +v; },
  gunMode: v => { ST.gunMode = v; },
  gunCls: v => { ST.gunCls = v; },
  gunSort: v => { toggleSort(ST.gunSort, v); },
  gpSort: v => { toggleSort(ST.gpSort, v); },
  spMode: v => { ST.spMode = v; saveSp(); },
  spNorm: v => { ST.spNorm = v; saveSp(); },
};
const saveSp = () => { try { localStorage.setItem("spread", JSON.stringify({ m: ST.spMode, n: ST.spNorm, h: ST.spHide1 })); } catch (_) {} };
// текущая пара сравнения (как её показывает compareBlock)
function cmpNow() {
  const r = parse(location.hash);
  const a = r.pg === "player" ? (BYSLUG.get(r.slug) || {}).name : (ST.cmpA && BYNAME.has(ST.cmpA) ? ST.cmpA : (MAIN[0] || S.rows[0]).name);
  let b = ST.cmpB && BYNAME.has(ST.cmpB) && ST.cmpB !== a ? ST.cmpB : null;
  if (!b) { const foes = sortBy(seasonFoes(BYNAME.get(a)), z => z.gave + z.took, -1); b = foes[0] ? foes[0].n : (MAIN.find(z => z.name !== a) || S.rows.find(z => z.name !== a)).name; }
  return [a, b];
}
document.addEventListener("click", e => {
  let t = e.target.closest("[data-a]");
  if (t && t.classList.contains("sheet") && e.target.closest("[data-stop]")) t = null;
  if (t) {
    const a = t.dataset.a;
    if (a === "back") { if (DEPTH > 0) { e.preventDefault(); history.back(); } return; }
    if (a === "spHide1") return;
    const fn = ACT[a]; if (!fn) return;
    const res = fn(t.dataset.v);
    if (res === "nav") return; // ссылка сама сменит адрес
    if (t.tagName === "A") e.preventDefault();
    render(true); return;
  }
  if (ST.meOpen && !e.target.closest(".me")) { ST.meOpen = false; render(true); return; }
  const tr = e.target.closest("tr[data-href]");
  if (tr && !e.target.closest("a")) location.hash = tr.dataset.href;
});
document.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.a === "spHide1") { ST.spHide1 = e.target.checked; saveSp(); render(true); } });
document.addEventListener("keydown", e => { if (e.key === "Escape" && (ST.sheet || ST.meOpen)) { ST.sheet = null; ST.meOpen = false; render(true); } });
window.addEventListener("hashchange", () => { DEPTH++; ST.sheet = null; ST.meOpen = false; ST.gExp = null; render(false); });
render(false);
