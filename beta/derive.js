// Производные данные поверх модели live-сайта: ключи страниц, места, команды игры, радары.
"use strict";
const S = season();
const MAXG = Math.max(...S.rows.map(r => r.games));
const MIN = Math.ceil(MAXG * 0.6); // как в номинациях сезона live-сайта: от 60% игр
S.rows.forEach(r => { r.slug = slug(r.name); r.rating = r.mvp / r.games; r.main = r.games >= MIN; r.aliveP = r.rounds ? r.alive / r.rounds : null; });
const MAIN = S.rows.filter(r => r.main).sort((a, b) => b.rating - a.rating);
MAIN.forEach((r, i) => r.rank = i + 1);
// локации: 18.10 и 01.11 — Зубр, остальные — Склады (Подвал добавим после первой игры там)
// локация — поле location в файле игры (как на основном сайте); новая локация появится сама после первой игры там
const LOC_ORDER = ["Склады", "Зубр", "Подвал"];
const locOfG = g => g.location || "";
const LOC_LIST = [...new Set(DATA.games.map(locOfG).filter(Boolean))].sort((a, b) => ((LOC_ORDER.indexOf(a) + 1) || 99) - ((LOC_ORDER.indexOf(b) + 1) || 99) || a.localeCompare(b, "ru"));
const LOCS = [["all", "Все локации"], ...LOC_LIST.map(l => [l, l])];
const LOC_CACHE = { all: { rows: S.rows, min: MIN, n: DATA.games.length } };
function locData(loc) {
  if (LOC_CACHE[loc]) return LOC_CACHE[loc];
  const games = DATA.games.filter(g => locOfG(g) === loc), s = season(games);
  const mx = Math.max(1, ...s.rows.map(r => r.games)), min = Math.ceil(mx * 0.6);
  s.rows.forEach(r => { r.slug = slug(r.name); r.rating = r.mvp / r.games; r.main = r.games >= min; r.aliveP = r.rounds ? r.alive / r.rounds : null; });
  return LOC_CACHE[loc] = { rows: s.rows, min, n: games.length };
}
const BYNAME = new Map(S.rows.map(r => [r.name, r]));
const BYSLUG = new Map(S.rows.map(r => [r.slug, r]));
S.guns.forEach(g => { g.slug = slug(g.name); });
const GUNSLUG = new Map(S.guns.map(g => [g.slug, g]));
const gunOfKey = k => S.guns.find(g => g.gkey === k);
const GL = allGames().map(x => ({ ...x, m: S.models[x.i], date: x.g.date }));
GL.forEach((x, k) => {
  x.sc = scoreOf(x.m);
  const parts = [...x.sc.parts].sort((p, q) => q[1] - p[1]);
  x.ta = parts[0][0]; x.tb = parts[1] ? parts[1][0] : parts[0][0];
  x.win = parts[1] && parts[0][1] > parts[1][1] ? x.ta : null;
  x.replay = DATA.replays.includes(x.date);
  x.num = GL.length - k; // номер игры в сезоне
  x.hits = hitsOf(x.m);
});
const gameByKey = k => GL.find(x => x.key === k);
const plHref = name => BYNAME.has(name) ? `#player-${BYNAME.get(name).slug}` : "#players";
const gunHref = g => g ? `#gun-${g.slug}` : "#guns";
const gamesOf = name => GL.map(x => ({ ...x, p: x.m.P.find(p => p.name === name) })).filter(x => x.p);

// основная команда игрока в игре (где сыграл большую часть)
const mainTeam = (m, p) => p.swap ? [...p.teams].sort((a, b) => m.shareT(p, b) - m.shareT(p, a))[0] : p.teams[0];
// раунды игрока за команду (1-based [a,b]); для старых смен без segRounds — по точке смены
function segRanges(m, p) {
  if (p.segRounds) return p.segRounds;
  if (p.swap && m.swaps.length === 1 && p.segs.length === 2) return [[1, m.swaps[0]], [m.swaps[0] + 1, m.winners.length]];
  return null;
}
// сводка команды в игре (как табло live-сайта) + доживания
function teamStat(m, t) {
  const { P, valT, estH } = m, mem = P.filter(p => p.teams.includes(t)), segOf = p => p.segs.filter(s => s.team === t);
  const dealt = sum(P, a => sum(P, v => valT(a, v, t)));
  const recv = sum(mem, p => sum(segOf(p), s => s.recv)), shots = sum(mem, p => sum(segOf(p), s => s.shots)), deaths = sum(mem, p => sum(segOf(p), s => s.deaths));
  let alive = 0, played = 0, eA = false;
  for (const p of mem) {
    if (!p.swap) { if (p.alive != null) { alive += p.alive; played += p.nR; if (p.e.alive) eA = true; } continue; }
    const rg = segRanges(m, p); if (!rg || !p.died) continue;
    rg.forEach(([a, b], k) => { if (p.segs[k] && p.segs[k].team === t) for (let r = a; r <= b; r++) { const d = p.died[r - 1]; if (d != null) { played++; if (d === 0) alive++; } } });
  }
  const won = m.winners.filter(w => w === t).length;
  const eD = P.some(v => !v.teams.includes(t) && v.est.has("recv") && P.some(a => estH(a, v))) || P.some(a => a.teams.includes(t) && a.e.dealt);
  const eR = mem.some(p => p.e.recv), eK = mem.some(p => p.e.deaths), eS = mem.some(p => p.e.shots);
  const tm = mem.filter(p => m.shareT(p, t) > .5).sort((a, b) => m.mvpT(b, t) - m.mvpT(a, t))[0];
  return { t, mem, dealt, recv, shots, deaths, alive, played, won, acc: div(dealt, shots), aliveP: played ? alive / played : 0, eD, eR, eK, eS, eA, mvp: tm };
}
// радар команд: 100 = лучшая из двух сторон
function teamRadar(x) {
  const A = teamStat(x.m, x.ta), B = teamStat(x.m, x.tb);
  const ax = [], va = [], vb = [];
  const add = (l, a, b, f, low) => { const best = low ? Math.min(a, b) : Math.max(a, b); const sc = v => !best ? 0 : low ? (v ? 100 * best / v : 100) : 100 * v / best;
    ax.push({ l, s: `${f(a)} : ${f(b)}` }); va.push(sc(a)); vb.push(sc(b)); };
  if (x.m.winners.length) add("Раунды", A.won, B.won, String);
  add("Попадания", A.dealt, B.dealt, fmt);
  add("Точность", A.acc, B.acc, v => pct(v).replace("%", ""));
  add("Защита", A.recv, B.recv, fmt, true);
  add("Живучесть", A.deaths, B.deaths, fmt, true);
  if (A.played && B.played) add("Дожил", A.aliveP, B.aliveP, v => Math.round(v * 100) + "%");
  return { A, B, ax, va, vb };
}
// радар игрока сезона: 100 = лучший среди игроков основного списка (от MIN игр)
const RAX = [
  ["Рейтинг", r => r.rating, v => fmt(v)],
  ["Попад.", r => r.dealt / r.games, onePt],
  ["Точность", r => r.accPerGame, pct],
  ["Коэф.", r => r.ratioPerGame, r2],
  ["Дожил", r => r.aliveP ?? 0, v => Math.round(v * 100) + "%"],
  ["Живуч.", r => r.deaths / r.games, onePt, true],
];
const RBEST = RAX.map(([, f, , low]) => { const v = MAIN.map(f).filter(x => isFinite(x) && x > 0); return low ? Math.min(...v) : Math.max(...v); });
const radarVals = r => RAX.map(([, f, , low], i) => { const v = f(r); if (!isFinite(v) || !v) return low ? 0 : 0; return Math.min(100, low ? 100 * RBEST[i] / v : 100 * v / RBEST[i]); });
const radarAxes = r => RAX.map(([l, f, show]) => ({ l, s: r ? show(f(r)) : "" }));

// номинации игры / сезона как данные (логика nomTiles live-сайта)
function nomData(rows, noms = NOMS) {
  return noms.map(([title, label, f, dir, show, ok]) => {
    const k = NOM_KEY[title];
    const list = rows.filter(r => (ok ? ok(r) : true) && isFinite(f(r)) && !unknownOf(r)[k]);
    if (!list.length) return null;
    const best = dir > 0 ? Math.max(...list.map(f)) : Math.min(...list.map(f));
    const w = list.filter(r => Math.abs(f(r) - best) < 1e-9);
    return { title, label, w, v: approx(w.some(r => r.e && r.e[k])) + show(best), icon: NOM_ICON[title] };
  }).filter(Boolean);
}
// номинации сезона, которые выиграл игрок (для «наград сезона» в профиле)
const SEASON_NOM_LIST = (() => {
  const l = nomData(S.rows.filter(r => r.games >= MIN), SEASON_NOMS);
  const mx = Math.max(...S.rows.map(r => r.mvps));
  if (mx) l.splice(1, 0, { title: "Коллекционер MVP", label: "Чаще всех MVP игры", w: S.rows.filter(r => r.mvps === mx), v: plural(mx, ["раз", "раза", "раз"]), icon: "layers" });
  return l;
})();
// дуэли сезона игрока
const seasonFoes = s => [...new Set([...Object.keys(s.pairs), ...Object.keys(s.against)])].map(n => ({ n, gave: s.pairs[n] || 0, took: s.against[n] || 0, g: (s.meet || {})[n] || 0 }));
const PAIRS = (() => { const pr = []; S.rows.forEach((a, i) => S.rows.slice(i + 1).forEach(b => { const x = a.pairs[b.name] || 0, y = b.pairs[a.name] || 0; if (x + y) pr.push(x >= y ? { a, b, x, y, n: x + y, g: (a.meet || {})[b.name] || 1 } : { a: b, b: a, x: y, y: x, n: x + y, g: (a.meet || {})[b.name] || 1 }); })); return pr.sort((p, q) => q.n - p.n); })();
