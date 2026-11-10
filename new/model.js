const DATA = { games: [], replays: [] };
const TEAMS = { 0: { name: "Красные", c: "var(--red)" }, 1: { name: "Синие", c: "var(--blue)" }, 2: { name: "Жёлтые", c: "var(--yellow)" }, 3: { name: "Зелёные", c: "var(--green)" } };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = n => Math.round(n).toLocaleString("ru-RU");
const pct = x => (x * 100).toFixed(1).replace(".", ",") + "%";
const r2 = x => isFinite(x) ? x.toFixed(2).replace(".", ",") : "∞";
const div = (a, b) => b ? a / b : a ? Infinity : 0;
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const plural = (n, w) => `${fmt(n)} ${w[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2]}`;
const HIT = ["попадание", "попадания", "попаданий"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const dateRu = d => { const [y, m, dd] = (d || "").split("-").map(Number); return y ? `${dd} ${MONTHS[m - 1]} ${y}` : "без даты"; };
const dateShort = d => { const [y, m, dd] = (d || "").split("-"); return y ? `${dd}.${m}.${y}` : "—"; };
const dot = t => `<span class="dot" style="--c:${TEAMS[t].c}"></span>`;
// Загрузка игр скрыта, пока разбор не автоматизирован; редактор открывается по адресу с ?admin
const state = { canEdit: new URLSearchParams(location.search).has("admin") };

// ---------- модель игры ----------
function gameModel(g) {
  const P = g.players.map((p, i) => {
    const raw = sum(p.segs, s => s.shots), k = p.shotsAdj != null && raw ? p.shotsAdj / raw : 1;
    const segs = p.segs.map(s => ({ ...s, shots: Math.round(s.shots * k) }));
    return { i, name: p.name || cap(p.gun), gun: cap(p.gun), gkey: p.key || p.gun, gen: p.gen, segs, teams: [...new Set(segs.map(s => s.team))],
      swap: new Set(segs.map(s => s.team)).size > 1, shots: sum(segs, s => s.shots), deaths: sum(segs, s => s.deaths), recv: sum(segs, s => s.recv), died: p.died,
      est: new Set(p.est || []), parts: p.parts || null, segRounds: p.segRounds || null };
  });
  // Оценки: тагер не считан, часть цифр восстановлена приблизительно (показываем со знаком «≈»)
  const HT = {}, HA = {}, HE = new Set();
  for (const [a, v, t, n, e] of g.hits) { HT[`${a}:${v}:${t}`] = n; HA[`${a}:${v}`] = (HA[`${a}:${v}`] || 0) + n; if (e) HE.add(`${a}:${v}`); }
  const estH = (a, v) => HE.has(`${a.i}:${v.i}`);
  const FT = {}, FA = {};
  for (const [k, v, t, ex, es] of g.frags) { FT[`${k}:${v}:${t}`] = [ex, es]; const x = FA[`${k}:${v}`] || [0, 0]; FA[`${k}:${v}`] = [x[0] + ex, x[1] + es]; }
  const val = (a, v) => HA[`${a.i}:${v.i}`] || 0, valT = (a, v, t) => HT[`${a.i}:${v.i}:${t}`] || 0;
  for (const p of P) {
    p.dealt = sum(P, v => val(p, v)); p.acc = div(p.dealt, p.shots); p.ratio = div(p.dealt, p.recv);
    p.foes = P.filter(o => o !== p && (val(p, o) || val(o, p)));
    // У старых тагеров нет журнала, но за раунд погибают не больше одного раза: без смерти = раунды − смерти
    const nR = ((g.rounds && g.rounds.winners) || []).length;
    // died: 1 — погиб в раунде, 0 — дожил, null — не играл этот раунд (сидел)
    const played = p.died ? p.died.filter(x => x != null).length : null;
    p.gr = played ?? nR; // раундов сыграно: для средних «за раунд»
    p.nR = p.died ? played : nR && p.deaths <= nR ? nR : 0;
    p.alive = p.died ? p.died.filter(x => x === 0).length : p.nR ? p.nR - p.deaths : null;
    p.fragEx = sum(P, v => (FA[`${p.i}:${v.i}`] || [0, 0])[0]); p.fragEs = sum(P, v => (FA[`${p.i}:${v.i}`] || [0, 0])[1]);
  }
  for (const p of P) {
    p.e = { dealt: P.some(v => estH(p, v)), recv: p.est.has("recv"), shots: p.est.has("shots"), deaths: p.est.has("deaths") };
    Object.assign(p.e, { acc: p.e.dealt || p.e.shots, ratio: p.e.dealt || p.e.recv, alive: p.e.deaths && !p.died });
    p.e.mvp = p.e.dealt;
  }
  // рейтинг: попадания игрока относительно среднего в этой игре; 100 — среднее число попаданий на игрока
  const avgD = sum(P, p => p.dealt) / P.length || 1;
  for (const p of P) p.mvp = 100 * p.dealt / avgD;
  // рейтинг игрока за одну команду: только попадания, сделанные за неё
  const valT0 = (a, v, t) => HT[`${a.i}:${v.i}:${t}`] || 0;
  const mvpT = (p, t) => { if (!p.swap) return p.mvp; const d = sum(P, v => valT0(p, v, t)), r = sum(p.segs.filter(s => s.team === t), s => s.recv), x = div(d, r);
    return 100 * d / avgD; };
  // доля игры за команду: по раундам, если они известны, иначе по выстрелам
  const shareT = (p, t) => { if (!p.swap) return 1;
    if (p.segRounds) { const n = q => sum(q, ([a, b]) => b - a + 1), all = n(p.segRounds); return div(n(p.segRounds.filter((_, k) => p.segs[k].team === t)), all); }
    return div(sum(p.segs.filter(s => s.team === t), s => s.shots), p.shots); };
  const teamIds = [...new Set(P.flatMap(p => p.teams))].sort();
  const winners = (g.rounds && g.rounds.winners) || [];
  const mvp = [...P].sort((a, b) => b.mvp - a.mvp)[0];
  return { g, P, teamIds, val, valT, estH, FT, FA, winners, mvp, mvpT, shareT, swaps: (g.rounds && g.rounds.swaps) || [] };
}
const gameKey = g => "game-" + String(g.file || g.date || "x").replace(/\.json$/i, "");
const allGames = () => DATA.games.map((g, i) => ({ g, i, key: gameKey(g) })).sort((a, b) => (b.g.date || "").localeCompare(a.g.date || "") || b.i - a.i);
const hitsOf = m => m.teamIds.map(t => [t, sum(m.P, a => sum(m.P, v => m.valT(a, v, t)))]);
function scoreOf(m) {
  const w = m.winners.filter(x => x !== null);
  if (w.length && w.length >= m.winners.length * 0.8) return { kind: "раунды", parts: m.teamIds.map(t => [t, w.filter(x => x === t).length]) };
  return { kind: "попадания", parts: m.teamIds.map(t => [t, sum(m.P, a => sum(m.P, v => m.valT(a, v, t)))]) };
}

// ---------- класс оружия ----------
// У пистолета 5 жизней и одиночные выстрелы, поэтому его статистику считаем отдельно от автоматов.
// Пистолет пока один: узнаём его по MAC тагера или по названию.
const PISTOL_KEYS = ["FC:A8:9A:00:4D:65"];
const clsOf = p => PISTOL_KEYS.includes(p.gkey) || /пистолет/i.test(p.gun) ? "pistol" : "auto";
const CLS = { all: "Все пушки", auto: "Автоматы", pistol: "Пистолет" };
const CLS1 = { auto: "автомат", pistol: "пистолет" };

// ---------- сезон ----------
function season(games = DATA.games) {
  const models = games.map(gameModel), S = new Map(), G = new Map();
  models.forEach((m, gi) => {
    for (const p of m.P) {
      const s = S.get(p.name) || { name: p.name, games: 0, mvp: 0, mvps: 0, dealt: 0, recv: 0, deaths: 0, shots: 0, gr: 0, alive: 0, rounds: 0, teams: [], best: 0, pairs: {}, against: {} };
      s.games++; if (isFinite(p.ratio)) (s.gameRatios = s.gameRatios || []).push(p.ratio); if (p.shots) (s.gameAcc = s.gameAcc || []).push(p.acc); s.mvp += p.mvp; if (m.mvp === p) s.mvps++; s.dealt += p.dealt; s.recv += p.recv; s.deaths += p.deaths; s.shots += p.shots; s.gr += p.gr;
      if (p.alive != null) { s.alive += p.alive; s.rounds += p.nR; }
      s.teams.push(...p.teams); s.best = Math.max(s.best, p.dealt);
      for (const o of m.P) { if (o === p) continue; const x = m.val(p, o), y = m.val(o, p); if (x || y) { s.meet = s.meet || {}; s.meet[o.name] = (s.meet[o.name] || 0) + 1; } if (x) s.pairs[o.name] = (s.pairs[o.name] || 0) + x; if (y) s.against[o.name] = (s.against[o.name] || 0) + y; }
      S.set(p.name, s);
      // пушки: тагер узнаём по MAC, поэтому переименования не разбивают статистику.
      // Если игрок за игру сменил тагер, у него есть parts: статистика пушек и классов считается по каждому тагеру отдельно
      for (const u of gunUnits(p)) {
        const gn = G.get(u.gkey) || { gkey: u.gkey, aliases: {}, gen: u.gen, by: {} };
        gn.aliases[u.gun.toLowerCase()] = (gn.aliases[u.gun.toLowerCase()] || 0) + 1;
        addStat(gn, u); addStat(gn.by[p.name] = gn.by[p.name] || { name: p.name }, u);
        addStat((s.guns = s.guns || {})[u.gkey] = s.guns[u.gkey] || { gkey: u.gkey }, u);
        const c = clsOf(u); gn.cls = c;
        const sc = addStat((s.byCls = s.byCls || {})[c] = s.byCls[c] || { cls: c, name: p.name, gameRatios: [], gameAcc: [] }, u);
        if (isFinite(u.ratio)) sc.gameRatios.push(u.ratio); if (u.shots) sc.gameAcc.push(u.acc);
        G.set(u.gkey, gn);
      }
    }
  });
  const rows = [...S.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  rows.forEach((s, k) => { s.key = "p" + k; s.acc = div(s.dealt, s.shots); s.ratio = div(s.dealt, s.recv); s.lastTeam = s.teams[s.teams.length - 1] ?? 0; s.ratioPerGame = s.gameRatios && s.gameRatios.length ? sum(s.gameRatios, x => x) / s.gameRatios.length : 0; s.accPerGame = s.gameAcc && s.gameAcc.length ? sum(s.gameAcc, x => x) / s.gameAcc.length : 0; });
  const guns = [...G.values()].map(g => ({ ...g, name: cap(Object.entries(g.aliases).sort((a, b) => b[1] - a[1])[0][0]).replace(/^([a-z]+)(\d+)$/i, (_, l, d) => l.toUpperCase() + d) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  guns.forEach((g, k) => { g.key = "gun" + k; finStat(g); g.players = Object.values(g.by).map(finStat); });
  const avgOf = a => a.length ? sum(a, x => x) / a.length : 0;
  rows.forEach(s => Object.values(s.byCls || {}).forEach(c => { finStat(c); c.key = s.key; c.ratioPerGame = avgOf(c.gameRatios); c.accPerGame = avgOf(c.gameAcc); }));
  rows.forEach(s => s.gunList = Object.values(s.guns || {}).map(x => finStat({ ...x, gun: guns.find(g => g.gkey === x.gkey) })));
  return { models, rows, guns };
}
// часть игры на одном тагере: у сменившего тагер по части на каждый, у остальных — весь игрок
const gunUnits = p => p.parts ? p.parts.map(x => finStat({ name: p.name, gkey: x.key, gun: cap(x.gun), gen: x.gen, dealt: x.dealt, recv: x.recv, deaths: x.deaths, shots: x.shots, gr: x.gr, teams: x.teams || p.teams,
  e: { dealt: false, recv: false, ratio: false, deaths: false, shots: false, acc: false }, est: new Set() })) : [p];
const addStat = (a, p) => { a.games = (a.games || 0) + 1; for (const k of ["dealt", "recv", "deaths", "shots", "gr"]) a[k] = (a[k] || 0) + p[k]; return a; };
const finStat = a => { a.acc = div(a.dealt, a.shots); a.ratio = div(a.dealt, a.recv); return a; };
// ---------- номинации ----------
const NOMS = [
  ["MVP", "Лучший рейтинг", r => r.mvp, 1, fmt],
  ["Терминатор", "Больше всех попаданий", r => r.dealt, 1, fmt],
  ["Спонсор патронного завода", "Больше всех выстрелов", r => r.shots, 1, fmt],
  ["Бережливый", "Меньше всех выстрелов", r => r.shots, -1, fmt],
  ["Белке в глаз", "Лучшая точность", r => r.acc, 1, pct],
  ["Штурмовик Империи", "Худшая точность", r => r.acc, -1, pct],
  ["Джон Уик", "Лучший КД (попал / получил)", r => r.ratio, 1, r2],
  ["Живой щит", "Больше всех получил", r => r.recv, 1, fmt],
  ["Невидимка", "Меньше всех получил", r => r.recv, -1, fmt],
  ["Кенни", "Больше всех смертей", r => r.deaths, 1, fmt],
  ["Горец", "Меньше всех смертей", r => r.deaths, -1, fmt],
  ["Последний герой", "Больше всех раундов без смерти", r => r.alive, 1, fmt, r => r.alive != null && r.rounds],
];
// для сезона счётные номинации берутся в среднем за игру, иначе сыгравшие меньше игр выигрывают «меньше всех»
const one = x => x.toFixed(1).replace(".", ",");
const HERO = ["Последний герой", "Чаще всех доживал до конца раунда", r => r.alive / r.rounds, 1, pct, r => r.alive != null && r.rounds];
const SEASON_NOMS = NOMS.map(([t, l, f, dir, show, ok]) => t === HERO[0] ? HERO
  : show === fmt ? [t, l + " за игру", r => f(r) / r.games, dir, /выстрел|рейтинг/.test(l) ? fmt : one, ok]
  : [t, l + " за игру", show === pct ? r => r.accPerGame : r => r.ratioPerGame, dir, show, ok]);
// рекорды: лучшее значение за одну игру среди всех игроков всех игр
const REC_NOMS = NOMS.map(n => n[0] === HERO[0] ? [HERO[0], "Больше всех раундов без смерти", r => r.alive, 1, fmt, HERO[5]] : n);
// в номинациях игры не участвуют цифры, которых нет совсем (тагер не считан), а частичные оценки помечены «≈»
const NOM_KEY = { MVP: "mvp", "Терминатор": "dealt", "Спонсор патронного завода": "shots", "Бережливый": "shots", "Белке в глаз": "acc", "Штурмовик Империи": "acc", "Джон Уик": "ratio",
  "Живой щит": "recv", "Невидимка": "recv", "Кенни": "deaths", "Горец": "deaths", "Последний герой": "alive" };
const unknownOf = r => r.est && r.e ? { shots: r.est.has("shots"), acc: r.est.has("shots"), recv: r.est.has("recv"), ratio: r.est.has("recv"), deaths: r.est.has("deaths"), alive: r.e.alive, mvp: r.est.has("recv") } : {};
const approx = on => on ? "≈" : "";
function nomTiles(rows, who, extra = [], noms = NOMS) {
  return noms.map(([title, label, f, dir, show, ok]) => {
    const k = NOM_KEY[title];
    const list = rows.filter(r => (ok ? ok(r) : true) && isFinite(f(r)) && !unknownOf(r)[k]);
    if (!list.length) return "";
    const best = dir > 0 ? Math.max(...list.map(f)) : Math.min(...list.map(f));
    const w = list.filter(r => Math.abs(f(r) - best) < 1e-9);
    return `<div class="nom"><span class="nt">${title}</span><span class="lab">${label}</span><span class="ws">${w.map(who).join("")}</span><span class="v">${approx(w.some(r => r.e && r.e[k]))}${show(best)}</span></div>`;
  }).concat(extra).join("");
}

// ---------- шапка ----------
