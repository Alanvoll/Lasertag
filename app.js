// Разбор экспорта игры LaserWar (format laserwar-game-export) в компактную сводку для сайта.
function analyzeExport(raw) {
  const game = raw && raw.game;
  if (!raw || raw.format !== "laserwar-game-export" || !game || !Array.isArray(game.participants) || !game.participants.length)
    throw new Error("Это не экспорт игры из приложения LT: нет участников.");
  const devices = new Map(((raw.source && raw.source.devices) || []).map(d => [d.address, d]));
  const P = game.participants.map((p, i) => {
    const dev = devices.get(p.mac), sn = dev && dev.snapshot;
    const rec = sn && Array.isArray(sn.records) ? sn.records : null;
    return { i, gid: p.gamerId, mac: p.mac || "", gun: String(p.taggerAlias || p.bluetoothName || ("ID " + p.gamerId)),
      name: p.playerName && p.playerName !== p.taggerAlias ? String(p.playerName) : "",
      team: p.teamColor, rec, src: p };
  });
  const byGid = new Map(P.map(p => [p.gid, p]));
  const teamIds = [...new Set(P.map(p => p.team))];
  const opp = t => teamIds.find(x => x !== t) ?? t;
  const H = new Map(), EX = new Map(); // "a:v:t" -> n
  const add = (m, k, n) => m.set(k, (m.get(k) || 0) + n);
  let unknownHits = 0;
  const tbit = d1 => (d1 >> 6) & 3; // старшие биты: команда стрелявшего в момент попадания
  for (const p of P) {
    if (p.rec) {
      const first136 = p.rec.find(r => r.type === 136);
      let cur = first136 ? first136.data1 : p.team, last = null;
      p.segs = [{ team: cur, shots: 0, deaths: 0, recv: 0 }];
      for (const r of p.rec) {
        const s = p.segs[p.segs.length - 1];
        if (r.type === 136) { if (r.data1 !== cur) { cur = r.data1; p.segs.push({ team: cur, shots: 0, deaths: 0, recv: 0 }); } }
        else if (r.type === 128) {
          s.recv++; const a = byGid.get(r.attackerId);
          if (a && a !== p) { add(H, `${a.i}:${p.i}:${tbit(r.data1)}`, 1); last = [a.i, tbit(r.data1)]; } else { unknownHits++; last = null; }
        } else if (r.type === 142) s.shots++;
        else if (r.type === 132) { s.deaths++; if (last) add(EX, `${last[0]}:${p.i}:${last[1]}`, 1); last = null; }
      }
      p.gen = 8;
    } else {
      p.gen = 7;
      p.segs = [{ team: p.team, shots: p.src.fireCount || 0, deaths: p.src.killed || 0, recv: p.src.hitsReceived || 0 }];
      for (const [id, n] of Object.entries(p.src.hitsByPlayer || {})) {
        if (!n) continue; const a = byGid.get(+id);
        if (a && a !== p) add(H, `${a.i}:${p.i}:${opp(p.team)}`, n); else unknownHits += n;
      }
    }
  }
  // Оценка фрагов по старым тагерам: пропорционально попаданиям с поправкой на добивание
  const deaths = p => p.segs.reduce((s, x) => s + x.deaths, 0), recv = p => p.segs.reduce((s, x) => s + x.recv, 0);
  const pairHits = new Map(); for (const [k, n] of H) { const [a, v] = k.split(":"); add(pairHits, a + ":" + v, n); }
  const exp = new Map(), act = new Map();
  for (const v of P.filter(p => p.gen === 8)) for (const [k, n] of pairHits) { const [a, vi] = k.split(":").map(Number); if (vi === v.i && recv(v)) add(exp, a, deaths(v) * n / recv(v)); }
  for (const [k, n] of EX) add(act, +k.split(":")[0], n);
  const K = 5, fac = a => ((act.get(a) || 0) + K) / ((exp.get(a) || 0) + K);
  const ES = new Map();
  for (const v of P.filter(p => p.gen === 7)) {
    const w = [...pairHits].map(([k, n]) => k.split(":").map(Number).concat(n)).filter(([a, vi]) => vi === v.i).map(([a, , n]) => [a, n * fac(a)]);
    const tot = w.reduce((s, x) => s + x[1], 0);
    if (tot) for (const [a, x] of w) add(ES, `${a}:${v.i}:${opp(v.team)}`, deaths(v) * x / tot);
  }
  // Раунды: пачка подряд идущих событий 144 = команда возрождения с пульта
  const intervals = p => {
    const iv = []; let cur = null, team = p.segs[0].team;
    p.rec.forEach((r, k) => {
      if (r.type === 136) team = r.data1;
      if (r.type === 144) { if (k === 0 || p.rec[k - 1].type !== 144) { cur = { n: 0, d: 0, team }; iv.push(cur); } }
      else if (cur) { if (r.type === 142 || r.type === 128) cur.n++; if (r.type === 132) cur.d++; }
    });
    return iv;
  };
  const logged = P.filter(p => p.gen === 8);
  const ivs = new Map(logged.map(p => [p.i, intervals(p)]));
  const counts = [...ivs.values()].map(v => v.length), freq = {};
  for (const c of counts) freq[c] = (freq[c] || 0) + 1;
  const nR = counts.length ? +Object.entries(freq).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0] : 0;
  for (const [i, iv] of ivs) { // лишние пачки (повтор команды, старт до игры) сливаем со следующим раундом
    while (iv.length > nR) {
      let m = 0; for (let k = 1; k < iv.length - 1; k++) if (iv[k].n < iv[m].n) m = k;
      const nx = iv[m + 1]; nx.n += iv[m].n; nx.d += iv[m].d; iv.splice(m, 1);
    }
    if (iv.length < nR) ivs.delete(i);
  }
  const died = P.map(p => ivs.has(p.i) ? ivs.get(p.i).map(x => x.d ? 1 : 0) : null);
  const teamAt = P.map(p => ivs.has(p.i) ? ivs.get(p.i).map(x => x.team) : null);
  const winners = [];
  for (let r = 0; r < nR; r++) {
    const st = {};
    for (const t of new Set(P.flatMap(p => p.segs.map(s => s.team)))) {
      const mem = P.filter(p => teamAt[p.i] ? teamAt[p.i][r] === t : p.segs.every(s => s.team === t));
      const known = mem.filter(p => died[p.i]);
      st[t] = { all: known.length === mem.length, alive: known.some(p => !died[p.i][r]), wiped: known.length === mem.length && known.every(p => died[p.i][r]) };
    }
    const ts = Object.keys(st).map(Number);
    let w = null;
    if (ts.length === 2) {
      const [a, b] = ts;
      if (st[a].wiped && !st[b].wiped) w = b; else if (st[b].wiped && !st[a].wiped) w = a;
      else if (st[a].alive && !st[b].alive && st[b].all) w = a; else if (st[b].alive && !st[a].alive && st[a].all) w = b;
      else if (st[a].alive && !st[b].alive) w = a; else if (st[b].alive && !st[a].alive) w = b;
    }
    winners.push(w);
  }
  const swaps = [];
  for (let r = 1; r < nR; r++) if (P.some(p => teamAt[p.i] && teamAt[p.i][r] !== teamAt[p.i][r - 1])) swaps.push(r);
  const created = String(game.createdAt || raw.exportedAt || "").slice(0, 10);
  return {
    date: created, title: "", unknownHits,
    players: P.map(p => ({ key: p.mac || p.gun, gid: p.gid, gun: p.gun, name: p.name, gen: p.gen, segs: p.segs, died: died[p.i] })),
    hits: [...H].map(([k, n]) => k.split(":").map(Number).concat(n)),
    frags: [...new Set([...EX.keys(), ...ES.keys()])].map(k => k.split(":").map(Number).concat(EX.get(k) || 0, Math.round((ES.get(k) || 0) * 100) / 100)),
    rounds: { winners, swaps, exact: winners.every(w => w !== null) && Object.values(teamAt).length > 0 && [...new Set(P.flatMap(p => p.segs.map(s => s.team)))].some(t => P.every(p => p.segs.every(s => s.team !== t) || died[p.i])) },
    awards: [],
  };
}

// Сайт статистики лазертага на GitHub Pages. Каждая игра лежит отдельным файлом в папке games/ репозитория.
// Список файлов берётся из games/index.json (его собирает GitHub Actions при деплое), а если его нет, из GitHub API.
const REPO = "Alanvoll/Lasertag", BRANCH = "main";
const DATA = { games: [], replays: [] };
const TEAMS = { 0: { name: "Красные", c: "var(--red)" }, 1: { name: "Синие", c: "var(--blue)" }, 2: { name: "Жёлтые", c: "var(--yellow)" }, 3: { name: "Зелёные", c: "var(--green)" } };
const app = document.getElementById("app");
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
      est: new Set(p.est || []) };
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
    p.gr = nR; // раундов в игре: для средних «за раунд»
    p.nR = p.died ? p.died.length : nR && p.deaths <= nR ? nR : 0;
    p.alive = p.died ? p.died.length - sum(p.died, x => x) : p.nR ? p.nR - p.deaths : null;
    p.fragEx = sum(P, v => (FA[`${p.i}:${v.i}`] || [0, 0])[0]); p.fragEs = sum(P, v => (FA[`${p.i}:${v.i}`] || [0, 0])[1]);
  }
  for (const p of P) {
    p.e = { dealt: P.some(v => estH(p, v)), recv: p.est.has("recv"), shots: p.est.has("shots"), deaths: p.est.has("deaths") };
    Object.assign(p.e, { acc: p.e.dealt || p.e.shots, ratio: p.e.dealt || p.e.recv, alive: p.e.deaths && !p.died });
    p.e.mvp = p.e.dealt || p.e.ratio;
  }
  // рейтинг MVP (временная формула): 100 — средний игрок этой игры; половина — попадания, половина — коэффициент (не больше 3)
  const rc = p => Math.min(isFinite(p.ratio) ? p.ratio : 3, 3), avgD = sum(P, p => p.dealt) / P.length || 1, avgR = sum(P, rc) / P.length || 1;
  for (const p of P) p.mvp = 50 * p.dealt / avgD + 50 * rc(p) / avgR;
  const teamIds = [...new Set(P.flatMap(p => p.teams))].sort();
  const winners = (g.rounds && g.rounds.winners) || [];
  const mvp = [...P].sort((a, b) => b.mvp - a.mvp)[0];
  return { g, P, teamIds, val, valT, estH, FT, FA, winners, mvp, swaps: (g.rounds && g.rounds.swaps) || [] };
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
function season() {
  const models = DATA.games.map(gameModel), S = new Map(), G = new Map();
  models.forEach((m, gi) => {
    for (const p of m.P) {
      const s = S.get(p.name) || { name: p.name, games: 0, mvp: 0, mvps: 0, dealt: 0, recv: 0, deaths: 0, shots: 0, gr: 0, alive: 0, rounds: 0, teams: [], best: 0, pairs: {}, against: {} };
      s.games++; if (isFinite(p.ratio)) (s.gameRatios = s.gameRatios || []).push(p.ratio); if (p.shots) (s.gameAcc = s.gameAcc || []).push(p.acc); s.mvp += p.mvp; if (m.mvp === p) s.mvps++; s.dealt += p.dealt; s.recv += p.recv; s.deaths += p.deaths; s.shots += p.shots; s.gr += p.gr;
      if (p.alive != null) { s.alive += p.alive; s.rounds += p.nR; }
      s.teams.push(...p.teams); s.best = Math.max(s.best, p.dealt);
      for (const o of m.P) { if (o === p) continue; const x = m.val(p, o), y = m.val(o, p); if (x || y) { s.meet = s.meet || {}; s.meet[o.name] = (s.meet[o.name] || 0) + 1; } if (x) s.pairs[o.name] = (s.pairs[o.name] || 0) + x; if (y) s.against[o.name] = (s.against[o.name] || 0) + y; }
      S.set(p.name, s);
      // пушки: тагер узнаём по MAC, поэтому переименования не разбивают статистику
      const gn = G.get(p.gkey) || { gkey: p.gkey, aliases: {}, gen: p.gen, by: {} };
      gn.aliases[p.gun.toLowerCase()] = (gn.aliases[p.gun.toLowerCase()] || 0) + 1;
      addStat(gn, p); addStat(gn.by[p.name] = gn.by[p.name] || { name: p.name }, p);
      addStat((s.guns = s.guns || {})[p.gkey] = s.guns[p.gkey] || { gkey: p.gkey }, p);
      const c = clsOf(p); gn.cls = c;
      const sc = addStat((s.byCls = s.byCls || {})[c] = s.byCls[c] || { cls: c, name: p.name, gameRatios: [], gameAcc: [] }, p);
      if (isFinite(p.ratio)) sc.gameRatios.push(p.ratio); if (p.shots) sc.gameAcc.push(p.acc);
      G.set(p.gkey, gn);
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
const addStat = (a, p) => { a.games = (a.games || 0) + 1; for (const k of ["dealt", "recv", "deaths", "shots", "gr"]) a[k] = (a[k] || 0) + p[k]; return a; };
const finStat = a => { a.acc = div(a.dealt, a.shots); a.ratio = div(a.dealt, a.recv); return a; };
const gunLink = g => g ? `<a class="plink" href="#${g.key}">${esc(g.name)}</a>` : "";
const playerLink = (name, rows, teams) => {
  const s = rows.find(r => r.name === name);
  const d = (teams || []).map(dot).join("");
  return s ? `<a class="who plink" href="#${s.key}">${d ? `<span class="dots">${d}</span>` : ""}${esc(name)}</a>` : `<span class="who">${d ? `<span class="dots">${d}</span>` : ""}${esc(name)}</span>`;
};

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
function header(active) {
  return `<header class="top"><a class="logo" href="#season"><i aria-hidden="true"></i>Лазертаг</a>
  <nav class="tabs" aria-label="Разделы">
    <a class="tab" href="#season" ${active === "season" ? 'aria-current="page"' : ""}>Сезон</a>
    <a class="tab" href="#games" ${active === "games" ? 'aria-current="page"' : ""}>Игры</a>
    <a class="tab" href="#players" ${active === "players" ? 'aria-current="page"' : ""}>Игроки</a>
    <a class="tab" href="#guns" ${active === "guns" ? 'aria-current="page"' : ""}>Пушки</a>
    <a class="tab" href="#perdeath" ${active === "perdeath" ? 'aria-current="page"' : ""}>На смерть <span class="tag">бета</span></a>
    ${state.canEdit ? `<a class="tab" href="#upload" ${active === "upload" ? 'aria-current="page"' : ""}>+ Добавить игру</a>` : ""}
  </nav></header>`;
}
const footer = () => `<footer class="foot"><span>Статистика по журналам тагеров LaserWar · <a href="https://github.com/${REPO}">исходники и файлы игр</a></span><span>${plural(DATA.games.length, ["игра", "игры", "игр"])} в базе</span></footer>`;

function gameCards(S) {
  const list = allGames();
  if (!list.length) return `<div class="empty">Игр пока нет.${state.canEdit ? ' <a href="#upload">Добавьте первую</a>.' : ""}</div>`;
  return `<div class="games">${list.map(({ g, i, key }) => {
    const m = S.models[i], sc = scoreOf(m), top = [...m.P].sort((a, b) => b.dealt - a.dealt)[0], topR = [...m.P].filter(p => isFinite(p.ratio)).sort((a, b) => b.ratio - a.ratio)[0];
    return `<a class="gcard" href="#${key}"><span class="date">${dateShort(g.date)}</span><h3>${esc(g.title || "Игра " + dateShort(g.date))}</h3>
      <span class="gscore">${hitsOf(m).map(([t, n]) => `<span class="num" style="color:${TEAMS[t].c}">${n}</span>`).join('<span class="muted">:</span>')}<small>попадания</small></span>
      ${sc.kind === "раунды" ? `<span class="grounds"><span class="muted">Раунды</span> ${sc.parts.map(([t, n]) => `<b style="color:${TEAMS[t].c}">${n}</b>`).join('<span class="muted">:</span>')}</span>` : ""}
      <span class="gmeta">${plural(m.P.length, ["игрок", "игрока", "игроков"])}${m.winners.length ? " · " + plural(m.winners.length, ["раунд", "раунда", "раундов"]) : ""}</span>
      <span class="gbest">${m.mvp ? `<span><span class="muted">MVP</span> ${esc(m.mvp.name)} (${fmt(m.mvp.mvp)})</span>` : ""}${top ? `<span><span class="muted">Попадания</span> ${esc(top.name)} (${top.dealt})</span>` : ""}${topR ? `<span><span class="muted">Коэффициент</span> ${esc(topR.name)} (${r2(topR.ratio)})</span>` : ""}</span></a>`;
  }).join("")}</div>`;
}

// ---------- таблица с сортировкой ----------
function sortable(id, cols, rows, rowHtml, initial, group = "") {
  let key = initial, dir = -1;
  const draw = () => {
    const c = cols.find(x => x[0] === key);
    const sorted = [...rows].sort((a, b) => key === "name" ? dir * a.name.localeCompare(b.name, "ru") : dir * ((c[2](a) ?? -1) - (c[2](b) ?? -1)));
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = `<thead>${group}<tr>${cols.map(([k, label, , cls]) => `<th class="${k === "name" ? "l" : ""} ${cls || ""}" ${k === key ? `aria-sort="${dir < 0 ? "descending" : "ascending"}"` : ""}><button data-k="${k}">${label}</button></th>`).join("")}</tr></thead><tbody>${sorted.map(r => rowHtml(r, key)).join("")}</tbody>`;
  };
  setTimeout(() => {
    const el = document.getElementById(id); if (!el) return;
    el.onclick = e => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; if (k === key) dir = -dir; else { key = k; dir = k === "name" ? 1 : -1; } draw(); };
    draw();
  });
}

// ---------- страницы ----------
function viewSeason(S) {
  const rounds = sum(S.models, m => m.winners.length), hits = sum(S.models, m => sum(m.P, p => p.dealt)), shots = sum(S.models, m => sum(m.P, p => p.shots));
  const who = r => playerLink(r.name, S.rows, []);
  // рекорды за одну игру
  const per = S.models.flatMap((m, gi) => m.P.map(p => ({ p, m, gi })));
  const rec = (title, label, f, show, filter = () => true) => {
    const l = per.filter(filter); if (!l.length) return "";
    const b = l.reduce((x, y) => f(y) > f(x) ? y : x);
    return `<div class="nom"><span class="nt">${title}</span><span class="lab">${label}</span><span class="ws">${playerLink(b.p.name, S.rows, b.p.teams)}</span><span class="v">${show(f(b))}</span><span class="sub">${dateRu(b.m.g.date)}</span></div>`;
  };
  return `${header("season")}
  <section class="hero"><span class="eyebrow">Сезон ${esc((DATA.games.map(g => (g.date || "").slice(0, 4)).filter(Boolean).sort().pop()) || "")}</span><h1>Статистика сезона</h1>
    <div class="facts"><div class="fact"><span class="v">${DATA.games.length}</span><span class="k">${plural(DATA.games.length, ["игра", "игры", "игр"]).split(" ")[1]} сыграно</span></div>
    <div class="fact"><span class="v">${fmt(rounds)}</span><span class="k">раундов</span></div>
    <div class="fact"><span class="v">${fmt(hits)}</span><span class="k">попаданий</span></div>
    <div class="fact"><span class="v">${fmt(shots)}</span><span class="k">выстрелов</span></div></div></section>
  <section><h2>Игры</h2>${gameCards(S)}</section>
  ${S.rows.length ? `<section><div class="head"><h2>Игроки за сезон</h2><div class="row">${clsSeg()}<div class="seg" role="group" aria-label="Режим таблицы"><button data-mode="avg">Среднее за игру</button><button data-mode="rnd">За раунд</button><button data-mode="tot">Всего</button></div></div></div><div class="scroll"><table id="seasonTable"></table></div><p class="note">Нажмите на имя, чтобы открыть страницу игрока. Заголовки столбцов сортируют таблицу. «Автоматы» и «Пистолет» показывают только игры с этим оружием: у пистолета 5 жизней и одиночные выстрелы, поэтому его цифры отдельно.</p></section>
  <section><div class="head"><h2>Номинации сезона</h2><div class="seg" role="group" aria-label="Режим номинаций"><button data-nmode="avg">Среднее</button><button data-nmode="rec">Рекорд за игру</button></div></div>
    <div data-npane="avg"><div class="noms">${nomTiles(S.rows.filter(r => r.games >= Math.ceil(Math.max(...S.rows.map(z => z.games)) * 0.6)), who, (() => { const mx = Math.max(...S.rows.map(r => r.mvps)); return mx ? [`<div class="nom"><span class="nt">Коллекционер MVP</span><span class="lab">Чаще всех MVP игры</span><span class="ws">${S.rows.filter(r => r.mvps === mx).map(who).join("")}</span><span class="v">${plural(mx, ["раз", "раза", "раз"])}</span></div>`] : []; })(), SEASON_NOMS)}</div>
    <p class="note">В среднем за игру: каждая цифра — среднее по играм игрока. Рейтинг MVP: 100 — средний игрок игры, половина — попадания, половина — коэффициент. Учитываются те, кто сыграл не меньше 60% игр сезона. Доля раундов без смерти считается только по тагерам с журналом событий.</p></div>
    <div data-npane="rec"><div class="noms">${nomTiles(per.map(({ p, m }) => ({ ...p, rounds: p.nR, date: m.g.date })), r => `${playerLink(r.name, S.rows, [])}<span class="muted">${dateShort(r.date).slice(0, 5)}</span>`, [], REC_NOMS)}</div>
    <p class="note">Лучший результат за одну игру среди всех игроков сезона, рядом дата игры.</p></div></section>
  ${(() => { const pr = []; S.rows.forEach((a, i) => S.rows.slice(i + 1).forEach(b => { const x = a.pairs[b.name] || 0, y = b.pairs[a.name] || 0; if (x + y) pr.push(x >= y ? { a, b, x, y, n: x + y, g: (a.meet || {})[b.name] || 1 } : { a: b, b: a, x: y, y: x, n: x + y, g: (a.meet || {})[b.name] || 1 }); }));
    pr.sort((p, q) => q.n - p.n); const top = pr, mx = top.length ? top[0].n : 1;
    const cards = S.rows.map(s => ({ s, rows: [...new Set([...Object.keys(s.pairs), ...Object.keys(s.against)])].map(n => ({ n, gave: s.pairs[n] || 0, took: s.against[n] || 0 })).sort((a, b) => (b.gave + b.took) - (a.gave + a.took)) })).filter(c => c.rows.length).sort((a, b) => b.s.ratio - a.s.ratio);
    const cmx = Math.max(1, ...cards.flatMap(c => c.rows.map(r => Math.max(r.gave, r.took))));
    const playersPane = `<div class="duels">${cards.map(({ s, rows }) => `<div class="duel"><div class="duel-head"><div>${playerLink(s.name, S.rows, [])}<span class="duel-sum">${plural(s.games, ["игра", "игры", "игр"])} · попал ${fmt(s.dealt)} · получил ${fmt(s.recv)}</span></div><div class="ratio">${r2(s.ratio)}<small>попал / получил</small></div></div>
      <div class="drows" data-sortable><div class="drow hd"><span></span><span class="half lft"><button data-sk="gave">попал</button></span><span class="half rgt"><button data-sk="took">получил</button></span><span class="bal"><button data-sk="tot" aria-pressed="true">всего</button></span><span class="bal"><button data-sk="ratio">коэф.</button></span></div>
      ${rows.map(r => `<div class="drow" data-gave="${r.gave}" data-took="${r.took}" data-tot="${r.gave + r.took}" data-ratio="${r.took ? r.gave / r.took : 1e9 + r.gave}" title="попал ${r.gave}, получил ${r.took}, всего ${r.gave + r.took}"><span class="nm">${esc(r.n)}</span><span class="half lft"><span class="num">${r.gave}</span><i style="--c:var(--gold);width:${(r.gave / cmx * 72).toFixed(1)}%"></i></span><span class="half rgt"><i style="--c:var(--muted);width:${(r.took / cmx * 72).toFixed(1)}%"></i><span class="num">${r.took}</span></span><span class="bal">${r.gave + r.took}</span><span class="bal">${r.took ? r2(r.gave / r.took) : "∞"}</span></div>`).join("")}</div></div>`).join("")}</div>
      <p class="note">Карточка игрока за весь сезон: слева — сколько раз он попал в соперника, справа — сколько раз соперник попал в него. «Всего» — сумма в обе стороны. Карточки идут по коэффициенту «попал / получил», заголовки столбцов сортируют список внутри карточки.</p>`;
    return top.length ? `<section><div class="head"><h2>Главные противостояния</h2><div class="seg" role="group" aria-label="Вид противостояний"><button data-dmode="pairs" aria-pressed="true">Пары</button><button data-dmode="players" aria-pressed="false">По игрокам</button></div></div><div data-dpane="pairs"><div class="frags" data-psort><div class="prow hd"><span></span><span></span><span class="ptot"><button data-sk="n" aria-pressed="true">всего</button></span><span class="pavg"><button data-sk="avg">за игру</button></span><span class="pk"><button data-sk="k">коэф.</button></span></div>
    ${top.map((z, i) => `<div class="prow" data-n="${z.n}" data-avg="${z.n / z.g}" data-k="${z.y ? z.x / z.y : 1e9}"${i >= 10 ? " hidden" : ""}><span class="pn">${playerLink(z.a.name, S.rows, [])}<span class="muted">и</span>${playerLink(z.b.name, S.rows, [])}</span>
      <span class="ptrack"><i style="--c:var(--gold);width:${(z.x / mx * 100).toFixed(1)}%"></i><i style="--c:var(--muted);width:${(z.y / mx * 100).toFixed(1)}%"></i></span>
      <span class="ptot num">${z.n}<small>${z.x} : ${z.y}</small></span><span class="pavg num">${(z.n / z.g).toFixed(1).replace(".", ",")}<small>${plural(z.g, ["игра", "игры", "игр"])}</small></span><span class="pk num">${z.y ? r2(z.x / z.y) : "∞"}<small>коэф.</small></span></div>`).join("")}${top.length > 10 ? `<button class="pmore">Все пары (${top.length})</button>` : ""}</div><p class="note">Заголовки столбцов сортируют список, показаны первые 10 пар. Кто с кем чаще всего сходился в бою за сезон: сумма попаданий друг в друга во всех играх, под ней счёт в паре. Справа — в среднем за игру, сколько игр пара встречалась как соперники, и коэффициент «попал / получил» первого в паре.</p></div><div data-dpane="players" hidden>${playersPane}</div></section>` : ""; })()}
` : ""}
  ${footer()}`;
}
let nomMode = "avg";
function nomsInit() {
  const pick = () => { document.querySelectorAll("[data-nmode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.nmode === nomMode)); document.querySelectorAll("[data-npane]").forEach(el => el.hidden = el.dataset.npane !== nomMode); };
  document.querySelectorAll("[data-nmode]").forEach(b => b.onclick = () => { nomMode = b.dataset.nmode; pick(); }); pick();
}
let seasonMode = "avg", seasonCls = "all";
const clsSeg = () => `<div class="seg" role="group" aria-label="Оружие">${Object.entries(CLS).map(([k, v]) => `<button data-cls="${k}">${v}</button>`).join("")}</div>`;
function seasonTableInit(S) {
  const one = x => x.toFixed(1).replace(".", ",");
  const COLS = {
    avg: [["name", "Игрок", r => r.name], ["games", "Игр", r => r.games, String], ["perGame", "Попал", r => r.dealt / r.games, one], ["recvPG", "Получил", r => r.recv / r.games, one],
      ["ratioPerGame", "Попал / получил", r => r.ratioPerGame, r2], ["deathsPG", "Смерти", r => r.deaths / r.games, one], ["shotsPG", "Выстрелы", r => r.shots / r.games, x => fmt(x)], ["accPerGame", "Точность", r => r.accPerGame, pct]],
    rnd: [["name", "Игрок", r => r.name], ["gr", "Раундов", r => r.gr, String], ["dealtPR", "Попал", r => div(r.dealt, r.gr), r2], ["recvPR", "Получил", r => div(r.recv, r.gr), r2],
      ["ratio", "Попал / получил", r => r.ratio, r2], ["deathsPR", "Смерти", r => div(r.deaths, r.gr), r2], ["shotsPR", "Выстрелы", r => div(r.shots, r.gr), one], ["acc", "Точность", r => r.acc, pct]],
    tot: [["name", "Игрок", r => r.name], ["games", "Игр", r => r.games, String], ["dealt", "Попал", r => r.dealt, fmt], ["recv", "Получил", r => r.recv, fmt],
      ["ratio", "Попал / получил", r => r.ratio, r2], ["deaths", "Смерти", r => r.deaths, fmt], ["shots", "Выстрелы", r => r.shots, fmt], ["acc", "Точность", r => r.acc, pct]],
  };
  const draw = () => {
    const cols = COLS[seasonMode];
    document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === seasonMode));
    document.querySelectorAll("[data-cls]").forEach(b => b.setAttribute("aria-pressed", b.dataset.cls === seasonCls));
    const rows = seasonCls === "all" ? S.rows : S.rows.filter(r => r.byCls && r.byCls[seasonCls]).map(r => r.byCls[seasonCls]);
    const max = Object.fromEntries(cols.slice(1).map(([k, , f]) => [k, Math.max(1e-9, ...rows.map(f).filter(isFinite))]));
    // полоса — в столбце, по которому отсортирована таблица
    const td = (r, key, [k, , f, show]) => k === key && isFinite(f(r))
      ? `<td class="num barcell"><span class="bar" style="--c:var(--gold);width:${Math.round(f(r) / max[k] * 70)}px;margin-right:8px"></span>${show(f(r))}</td>`
      : `<td class="num">${show(f(r))}</td>`;
    sortable("seasonTable", cols, rows, (r, key) => `<tr><th class="l">${playerLink(r.name, S.rows, [])}</th>${cols.slice(1).map(c => td(r, key, c)).join("")}</tr>`, { avg: "perGame", rnd: "dealtPR", tot: "dealt" }[seasonMode]);
  };
  document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { seasonMode = b.dataset.mode; draw(); });
  document.querySelectorAll("[data-cls]").forEach(b => b.onclick = () => { seasonCls = b.dataset.cls; draw(); });
  draw();
}

// ---------- попадания на смерть ----------
// Одна запись на игру игрока: r — получил, k — попал, x — смертей; игры без смертей не считаем.
let pdMode = "r";
try { const v = localStorage.getItem("hpd-mode"); if (v === "r" || v === "k") pdMode = v; } catch (_) {}
const PD = {
  r: { lead: "Сколько попаданий игрок в среднем получал на одну свою смерть. Минимум 4: столько нужно, чтобы выбить автомат (пистолет 5). Чем больше, тем чаще он доживал раунд с ранениями.", lo: "меньше", hi: "больше" },
  k: { lead: "Сколько попаданий игрок делал в среднем на одну свою смерть. Это его размен: чем больше, тем дороже он отдавал жизнь.", lo: "худшая", hi: "лучшая" } };
function viewPerDeath(S) {
  return `${header("perdeath")}<section class="pd"><div><span class="eyebrow">Сезон · ${plural(DATA.games.length, ["игра", "игры", "игр"])}</span><h1>Попадания на смерть <span class="tag">бета</span></h1></div>
  <p class="muted" id="pdLead"></p>
  <div class="seg pdseg" role="group" aria-label="Что считать"><button data-m="r">Получил на смерть</button><button data-m="k">Попал на смерть</button></div>
  <div class="pdavg" id="pdAvg"></div><div class="pdlist" id="pdList"></div>
  <p class="note">Крупная цифра — среднее по всем играм игрока. Если он играл и с автоматом, и с пистолетом, ниже отдельные полосы для каждого: у пистолета 5 жизней вместо 4, поэтому его цифры выше. Полоска: светлая часть от худшей до лучшей игры, черта — среднее. «≈» — в игре часть данных оценена.</p></section>${footer()}`;
}
function perDeathInit(S) {
  const by = new Map();
  S.models.forEach(m => m.P.forEach(p => { if (!p.deaths) return;
    const l = by.get(p.name) || []; by.set(p.name, l);
    l.push({ d: dateShort(m.g.date).slice(0, 5), r: p.recv / p.deaths, k: p.dealt / p.deaths, pist: clsOf(p) === "pistol", er: !!(p.e.recv || p.e.deaths), ek: !!(p.e.dealt || p.e.deaths) }); }));
  const draw = () => {
    const md = pdMode, ek = "e" + md;
    document.querySelectorAll(".pdseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === md));
    document.getElementById("pdLead").textContent = PD[md].lead;
    const st = v => ({ avg: sum(v, x => x[md]) / v.length, lo: v.reduce((a, x) => x[md] < a[md] ? x : a), hi: v.reduce((a, x) => x[md] > a[md] ? x : a), n: v.length, e: v.some(x => x[ek]) });
    const rows = [...by].map(([n, g]) => { const a = g.filter(x => !x.pist), p = g.filter(x => x.pist);
      return { n, all: st(g), parts: [a.length && ["Автомат", st(a)], p.length && ["Пистолет", st(p)]].filter(Boolean) }; }).sort((a, b) => b.all.avg - a.all.avg);
    const vals = [...by.values()].flat().map(x => x[md]), mx = Math.max(...vals) * 1.04, mn = md === "r" ? 3.5 : 0;
    const pos = x => ((x - mn) / (mx - mn) * 100).toFixed(1) + "%", A = on => on ? "≈" : "", f = r2, gw = n => plural(n, ["игра", "игры", "игр"]);
    document.getElementById("pdAvg").innerHTML = `Среднее по всем игрокам <b class="num">${f(sum(vals, x => x) / vals.length)}</b>`;
    const part = (lab, t, showLab) => `${showLab ? `<span class="pdlab">${lab}<b class="num">${A(t.e)}${f(t.avg)}</b><small>${t.n > 1 ? gw(t.n) : "игра " + t.hi.d}</small></span>` : ""}
      ${t.n > 1 ? `<span class="pdtrack"><i style="left:${pos(t.lo[md])};width:calc(${pos(t.hi[md])} - ${pos(t.lo[md])} + 2px)"></i><u style="left:${pos(t.avg)}"></u></span>
      <span class="pdmm"><span>${PD[md].lo} <b class="num">${A(t.lo[ek])}${f(t.lo[md])}</b> · ${t.lo.d}</span><span>${PD[md].hi} <b class="num">${A(t.hi[ek])}${f(t.hi[md])}</b> · ${t.hi.d}</span></span>` : ""}`;
    document.getElementById("pdList").innerHTML = rows.map(r => { const two = r.parts.length > 1; return `<div class="pdcard">
      <span class="pdnm">${playerLink(r.n, S.rows, [])}<small>${r.all.n > 1 ? gw(r.all.n) : ""}${!two && r.parts[0][0] === "Пистолет" ? " · пистолет" : ""}</small></span>
      <span class="pdbig num">${A(r.all.e)}${f(r.all.avg)}<small>${r.all.n > 1 ? "в среднем" : "игра " + r.all.hi.d}</small></span>
      ${r.parts.map(([l, t]) => part(l, t, two)).join("")}</div>`; }).join("");
  };
  document.querySelector(".pdseg").onclick = ev => { const v = ev.target.dataset && ev.target.dataset.m; if (v) { pdMode = v; try { localStorage.setItem("hpd-mode", v); } catch (_) {} draw(); } };
  draw();
}

function viewGames(S) { return `${header("games")}<section><h1>Игры</h1>${gameCards(S)}</section>${footer()}`; }

function viewPlayers(S) {
  return `${header("players")}<section><div class="head"><h1>Игроки</h1><div class="row">${clsSeg()}<div class="seg" role="group" aria-label="Режим таблицы"><button data-mode="avg">Среднее за игру</button><button data-mode="rnd">За раунд</button><button data-mode="tot">Всего</button></div></div></div><div class="scroll"><table id="seasonTable"></table></div><p class="note">Нажмите на имя, чтобы открыть страницу игрока. «Автоматы» и «Пистолет» показывают только игры с этим оружием: у пистолета 5 жизней и одиночные выстрелы, поэтому его цифры отдельно.</p></section>${footer()}`;
}

// ---------- пушки ----------
const statCols = (first, avg) => [first, ["games", "Игр", r => r.games, String],
  avg ? ["dealtPG", "Попал за игру", r => r.dealt / r.games, x => x.toFixed(1).replace(".", ",")] : ["dealt", "Попал", r => r.dealt, fmt],
  avg ? ["recvPG", "Получил за игру", r => r.recv / r.games, x => x.toFixed(1).replace(".", ",")] : ["recv", "Получил", r => r.recv, fmt],
  ["ratio", "Попал / получил", r => r.ratio, r2], ["acc", "Точность", r => r.acc, pct],
  avg ? ["shotsPG", "Выстрелы за игру", r => r.shots / r.games, fmt] : ["shots", "Выстрелы", r => r.shots, fmt],
  avg ? ["deathsPG", "Смерти за игру", r => r.deaths / r.games, x => x.toFixed(1).replace(".", ",")] : ["deaths", "Смерти", r => r.deaths, fmt]];
function statTable(id, cols, rows, nameHtml, initial) {
  const max = Object.fromEntries(cols.slice(1).map(([k, , f]) => [k, Math.max(1e-9, ...rows.map(f).filter(isFinite))]));
  const td = (r, key, [k, , f, show]) => k === key && isFinite(f(r)) && k !== "games"
    ? `<td class="num barcell"><span class="bar" style="--c:var(--gold);width:${Math.round(f(r) / max[k] * 70)}px;margin-right:8px"></span>${show(f(r))}</td>`
    : `<td class="num">${show(f(r))}</td>`;
  sortable(id, cols, rows, (r, key) => `<tr><th class="l">${nameHtml(r)}</th>${cols.slice(1).map(c => td(r, key, c)).join("")}</tr>`, initial);
}
const genLabel = g => [g.name.toLowerCase().includes(CLS1[g.cls]) ? "" : CLS1[g.cls], g.gen === 8 ? "журнал" : "7 пок."].filter(Boolean).join(" · ");
function viewGuns(S) {
  const top = (f, filt = () => true) => { const l = S.guns.filter(g => filt(g) && isFinite(f(g))); return l.length ? l.reduce((a, b) => f(b) > f(a) ? b : a) : null; };
  const tile = (t, lab, g, v) => g ? `<div class="nom"><span class="nt">${t}</span><span class="lab">${lab}</span><span class="ws">${gunLink(g)}</span><span class="v">${v}</span></div>` : "";
  const many = g => g.games >= 2, a = top(g => g.dealt / g.games, many), b = top(g => g.ratio, many), c = top(g => g.acc, many), d = top(g => g.players.length);
  return `${header("guns")}<section class="hero"><span class="eyebrow">Тагеры</span><h1>Пушки</h1>
    <div class="facts"><div class="fact"><span class="v">${S.guns.length}</span><span class="k">${plural(S.guns.length, ["тагер", "тагера", "тагеров"]).split(" ")[1]}</span></div>
    <div class="fact"><span class="v">${sum(S.guns, g => g.players.length)}</span><span class="k">пар «игрок — пушка»</span></div></div></section>
  <section><div class="head"><h2>Пушки за сезон</h2><div class="seg" role="group" aria-label="Режим таблицы"><button data-gmode="avg">Среднее за игру</button><button data-gmode="tot">Всего</button></div></div><div class="scroll"><table id="gunTable"></table></div>
  <p class="note">Тагер узнаётся по его адресу Bluetooth, так что статистика не теряется, если пушку переименовали. Цифры зависят и от пушки, и от того, кто с ней играл: состав по каждой пушке есть на её странице.</p></section>
  <section><h2>Автоматы и пистолет</h2><div class="scroll"><table id="clsTable"></table></div><p class="note">Среднее за игру по всем играм с этим классом оружия. У пистолета 5 жизней и одиночные выстрелы, поэтому его удобнее сравнивать отдельно.</p></section>
  <section><h2>Рекорды пушек</h2><div class="noms">${tile("Главный калибр", "Больше всего попаданий за игру в среднем", a, a && (a.dealt / a.games).toFixed(1).replace(".", ","))}
    ${tile("Убойная", "Лучший коэффициент попал / получил", b, b && r2(b.ratio))}${tile("Снайперская", "Лучшая точность", c, c && pct(c.acc))}
    ${tile("Переходящее знамя", "Больше всего разных игроков", d, d && d.players.length)}</div><p class="note">Среди пушек, сыгравших хотя бы две игры.</p></section>${footer()}`;
}
let gunMode = "avg";
function gunsInit(S) {
  const draw = () => { document.querySelectorAll("[data-gmode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.gmode === gunMode));
    statTable("gunTable", statCols(["name", "Пушка", r => r.name], gunMode === "avg"), S.guns, g => `${gunLink(g)} <small class="muted">${genLabel(g)}</small>`, gunMode === "avg" ? "dealtPG" : "dealt"); };
  document.querySelectorAll("[data-gmode]").forEach(b => b.onclick = () => { gunMode = b.dataset.gmode; draw(); }); draw();
  const cls = ["auto", "pistol"].map(c => { const l = S.guns.filter(g => g.cls === c); return finStat({ name: CLS[c], ...["games", "dealt", "recv", "deaths", "shots"].reduce((o, k) => (o[k] = sum(l, g => g[k]), o), {}) }); }).filter(c => c.games);
  statTable("clsTable", statCols(["name", "Оружие", r => r.name], true), cls, r => esc(r.name), "dealtPG");
}
function viewGun(S, key) {
  const g = S.guns.find(z => z.key === key); if (!g) return viewGuns(S);
  const games = allGames().map(x => ({ ...x, m: S.models[x.i] })).map(x => ({ ...x, p: x.m.P.find(p => p.gkey === g.gkey) })).filter(x => x.p);
  const best = [...g.players].filter(r => isFinite(r.ratio)).sort((a, b) => b.ratio - a.ratio)[0];
  const alias = Object.keys(g.aliases).map(cap).filter(n => n !== g.name);
  return `${header("guns")}<section class="hero"><span class="eyebrow">Пушка · ${genLabel(g)}</span><h1>${esc(g.name)}</h1>
    <div class="facts"><div class="fact"><span class="v">${g.games}</span><span class="k">${plural(g.games, ["игра", "игры", "игр"]).split(" ")[1]}</span></div>
    <div class="fact"><span class="v">${fmt(g.dealt)}</span><span class="k">попаданий</span></div>
    <div class="fact"><span class="v">${r2(g.ratio)}</span><span class="k">попал / получил</span></div>
    <div class="fact"><span class="v">${pct(g.acc)}</span><span class="k">точность</span></div></div>
</section>
  <section><h2>Кто с ней играл</h2><div class="scroll"><table id="gunPlayers"></table></div><p class="note">${best && g.players.length > 1 ? `Лучше всех с этой пушкой по коэффициенту — ${esc(best.name)} (${r2(best.ratio)}). ` : ""}Заголовки столбцов сортируют таблицу.${alias.length ? ` В журналах пушка встречалась и как ${alias.map(esc).join(", ")}.` : ""}</p></section>
  <section><h2>По играм</h2><div class="scroll"><table><thead><tr><th class="l">Игра</th><th class="l">Игрок</th><th>Попал</th><th>Получил</th><th>Попал / получил</th><th>Смерти</th><th>Выстрелы</th><th>Точность</th></tr></thead>
  <tbody>${games.map(({ g: gm, key, p }) => `<tr><th class="l"><a class="plink" href="#${key}">${dateShort(gm.date)}</a></th><td class="l">${playerLink(p.name, S.rows, p.teams)}</td>
    <td class="num">${approx(p.e.dealt)}${p.dealt}</td><td class="num">${approx(p.e.recv)}${p.recv}</td><td class="num">${approx(p.e.ratio)}${r2(p.ratio)}</td><td class="num">${approx(p.e.deaths)}${p.deaths}</td><td class="num">${approx(p.e.shots)}${fmt(p.shots)}</td><td class="num">${approx(p.e.acc)}${pct(p.acc)}</td></tr>`).join("")}</tbody></table></div>${games.some(x => x.p.est.size || x.p.e.dealt) ? `<p class="note">«≈» — оценка: в той игре часть тагеров не считана. В итогах сезона оценки учтены как есть.</p>` : ""}</section>${footer()}`;
}

// ---------- графики прогресса игрока ----------
const PROG = [
  ["dealt", "Попал за раунд", p => div(p.dealt, p.gr), r2, 1],
  ["ratio", "Попал / получил", p => p.ratio, r2, 1],
  ["acc", "Точность", p => p.acc, pct, 1],
  ["recv", "Получил за раунд", p => div(p.recv, p.gr), r2, -1],
  ["deaths", "Смерти за раунд", p => div(p.deaths, p.gr), r2, -1],
  ["shots", "Выстрелы за раунд", p => div(p.shots, p.gr), x => x.toFixed(1).replace(".", ","), 0],
];
function progressCharts(games) {
  const list = [...games].reverse(); // по времени: старые слева
  if (list.length < 2) return `<p class="note">Графики прогресса появятся, когда у игрока будет хотя бы две игры.</p>`;
  const W = 320, H = 150, L = 8, R = 8, T = 16, B = 26;
  const x = i => L + (list.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (list.length - 1));
  return `<div class="prog">${PROG.map(([k, label, f, show, better]) => {
    const pts = list.map(({ g, m, p }) => {
      const others = m.P.map(f).filter(isFinite), avg = others.length ? sum(others, v => v) / others.length : 0;
      return { g, v: f(p), avg };
    });
    const fin = pts.filter(q => isFinite(q.v)), vals = [...fin.map(q => q.v), ...pts.map(q => q.avg)];
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo || hi || 1) * .15; lo = Math.max(0, lo - pad); hi += pad;
    const y = v => T + (H - T - B) * (1 - (Math.min(v, hi) - lo) / (hi - lo || 1));
    const line = (arr, get) => arr.map((q, i) => `${i ? "L" : "M"}${x(pts.indexOf(q)).toFixed(1)} ${y(get(q)).toFixed(1)}`).join("");
    const first = fin[0], last = fin[fin.length - 1], prev = fin[fin.length - 2];
    const d = last && prev ? last.v - prev.v : 0;
    const good = better && d ? Math.sign(d) === better : null;
    const dTxt = !prev ? "" : Math.abs(d) < 1e-9 ? "без изменений" : (d > 0 ? "▲ " : "▼ ") + show(Math.abs(d)).replace("∞", "—");
    return `<figure class="pchart"><figcaption><span class="pl">${label}${better < 0 ? ' <small>меньше — лучше</small>' : ""}</span>
      <span class="pv"><b>${last ? show(last.v) : "—"}</b><small class="pd ${good === true ? "up" : good === false ? "down" : ""}">${dTxt}${prev ? " к прошлой игре" : ""}</small></span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${label} по играм: ${pts.map(q => dateShort(q.g.date) + " — " + show(q.v)).join(", ")}">
        ${[0, .5, 1].map(t => `<line class="grid" x1="${L}" x2="${W - R}" y1="${(T + (H - T - B) * t).toFixed(1)}" y2="${(T + (H - T - B) * t).toFixed(1)}"/>`).join("")}
        <path class="avg" d="${line(pts, q => q.avg)}"/>
        <path class="me" d="${line(fin, q => q.v)}"/>
      </svg>
      <div class="pdots">${pts.map((q, i) => `<span class="xl" style="left:${(x(i) / W * 100).toFixed(2)}%;transform:translateX(${i === 0 ? "0" : i === pts.length - 1 ? "-100%" : "-50%"})">${dateShort(q.g.date).slice(0, 5)}</span>`).join("")}${pts.map((q, i) => isFinite(q.v) ? `<span class="pdot" style="left:${(x(i) / W * 100).toFixed(2)}%;top:${(y(q.v) / H * 100).toFixed(2)}%" tabindex="0"
        data-tip="${esc(`<b>${dateShort(q.g.date)}</b>${label}: ${show(q.v)}<br><span>среднее в игре: ${show(q.avg)}</span>`)}"></span>` : "").join("")}</div>
    </figure>`;
  }).join("")}</div>
  <div class="plegend"><span><i class="me"></i>игрок</span><span><i class="avg"></i>среднее по всем игрокам этой игры</span></div>`;
}
let playerTab = "table";
function progressInit() {
  const tabs = document.querySelectorAll("[data-ptab]");
  const pick = () => { tabs.forEach(b => b.setAttribute("aria-pressed", b.dataset.ptab === playerTab)); document.querySelectorAll("[data-pane]").forEach(el => el.hidden = el.dataset.pane !== playerTab); };
  tabs.forEach(b => b.onclick = () => { playerTab = b.dataset.ptab; pick(); }); pick();
  const box = document.querySelector(".prog"); if (!box) return;
  let tip = document.getElementById("ptip");
  if (!tip) { tip = document.createElement("div"); tip.id = "ptip"; tip.className = "ptip"; document.body.appendChild(tip); }
  const show = el => { tip.innerHTML = el.dataset.tip; tip.hidden = false; const r = el.getBoundingClientRect();
    tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2)) + "px"; tip.style.top = (r.top + scrollY - tip.offsetHeight - 10) + "px"; };
  const hide = () => tip.hidden = true; hide();
  box.querySelectorAll(".pdot").forEach(el => { el.onpointerenter = el.onfocus = () => show(el); el.onpointerleave = el.onblur = hide; });
}

function viewPlayer(S, key) {
  const s = S.rows.find(r => r.key === key);
  if (!s) return viewSeason(S);
  const games = allGames().map(x => ({ ...x, m: S.models[x.i] })).map(x => ({ ...x, p: x.m.P.find(p => p.name === s.name) })).filter(x => x.p);
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const tg = top(s.pairs), nm = top(s.against);
  return `${header("players")}
  <section class="hero"><span class="eyebrow">Игрок</span><h1>${esc(s.name)}</h1>
    <div class="facts"><div class="fact"><span class="v">${s.games}</span><span class="k">${plural(s.games, ["игра", "игры", "игр"]).split(" ")[1]}</span></div>
    <div class="fact"><span class="v">${fmt(s.dealt)}</span><span class="k">попаданий</span></div>
    <div class="fact"><span class="v">${r2(s.ratio)}</span><span class="k">попал / получил</span></div>
    <div class="fact"><span class="v">${pct(s.acc)}</span><span class="k">точность</span></div></div></section>
  <section><div class="head"><h2>По играм</h2><div class="seg" role="group" aria-label="Вид"><button data-ptab="table">Таблица</button><button data-ptab="prog">Прогресс</button></div></div>
  <div data-pane="prog">${progressCharts(games)}<p class="note">Одна точка — одна игра. Попадания, смерти и выстрелы поделены на число раундов в игре, чтобы игры разной длины можно было сравнивать. Пунктир — среднее по всем игрокам той же игры, чтобы было видно, лучше или хуже остальных. Наведите на точку, чтобы увидеть значения.</p></div>
  <div data-pane="table" class="scroll"><table><thead><tr><th class="l">Игра</th><th class="l">Команда</th><th>Попал</th><th>Получил</th><th>Попал / получил</th><th>Смерти</th><th>Выстрелы</th><th>Точность</th></tr></thead>
  <tbody>${games.map(({ g, key, p }) => `<tr><th class="l"><a class="plink" href="#${key}">${dateShort(g.date)}</a> <span class="muted">${esc(g.title || "")}</span></th><td class="l"><span class="dots">${p.teams.map(dot).join("")}</span> <a class="plink muted" href="#${(S.guns.find(z => z.gkey === p.gkey) || {}).key}">${esc(p.gun)}</a></td>
    <td class="num">${approx(p.e.dealt)}${p.dealt}</td><td class="num">${approx(p.e.recv)}${p.recv}</td><td class="num">${approx(p.e.ratio)}${r2(p.ratio)}</td><td class="num">${approx(p.e.deaths)}${p.deaths}</td><td class="num">${approx(p.e.shots)}${fmt(p.shots)}</td><td class="num">${approx(p.e.acc)}${pct(p.acc)}</td></tr>`).join("")}</tbody></table></div>${games.some(x => x.p.est.size || x.p.e.dealt) ? `<p class="note">«≈» — оценка: в той игре часть тагеров не считана. В итогах сезона оценки учтены как есть.</p>` : ""}</section>
  ${s.byCls && s.byCls.auto && s.byCls.pistol ? `<section><h2>Автомат и пистолет</h2><div class="scroll"><table id="pClsTable"></table></div><p class="note">Среднее за игру отдельно для игр с автоматом и с пистолетом.</p></section>` : ""}
  <section><h2>На каких пушках</h2><div class="scroll"><table id="pGunTable"></table></div><p class="note">Сумма по всем играм игрока с этим тагером. Нажмите на название, чтобы открыть страницу пушки.</p></section>
  ${(() => { const names = [...new Set([...Object.keys(s.pairs), ...Object.keys(s.against)])];
    const rows = names.map(n => ({ n, gave: s.pairs[n] || 0, took: s.against[n] || 0 })).sort((a, b) => (b.gave + b.took) - (a.gave + a.took));
    if (!rows.length) return ""; const mx = Math.max(...rows.map(r => Math.max(r.gave, r.took)), 1);
    return `<section><h2>Дуэли за сезон</h2><div class="duel" style="max-width:620px"><div class="drows" data-sortable><div class="drow hd"><span></span><span class="half lft"><button data-sk="gave">попал</button></span><span class="half rgt"><button data-sk="took">получил</button></span><span class="bal"><button data-sk="tot" aria-pressed="true">всего</button></span><span class="bal"><button data-sk="ratio">коэф.</button></span></div>
    ${rows.map(r => `<div class="drow" data-gave="${r.gave}" data-took="${r.took}" data-tot="${r.gave + r.took}" data-ratio="${r.took ? r.gave / r.took : 1e9}"><span class="nm">${esc(r.n)}</span><span class="half lft"><span class="num">${r.gave}</span><i style="--c:var(--gold);width:${(r.gave / mx * 72).toFixed(1)}%"></i></span><span class="half rgt"><i style="--c:var(--muted);width:${(r.took / mx * 72).toFixed(1)}%"></i><span class="num">${r.took}</span></span><span class="bal">${r.gave + r.took}</span><span class="bal">${r.took ? r2(r.gave / r.took) : "∞"}</span></div>`).join("")}</div></div>
    <p class="note">Все соперники за сезон. Сверху те, с кем чаще всего были стычки: «всего» — сумма попаданий в обе стороны. Заголовки столбцов сортируют список.</p></section>`; })()}
  <section><h2>Личные счёты за сезон</h2><div class="noms">
    ${tg ? `<div class="nom"><span class="nt">Груша для битья</span><span class="lab">В кого попадал чаще всего</span><span class="ws">${playerLink(tg[0], S.rows)}</span><span class="v">${plural(tg[1], HIT)}</span></div>` : ""}
    ${nm ? `<div class="nom"><span class="nt">Личный кошмар</span><span class="lab">Кто чаще всего попадал в него</span><span class="ws">${playerLink(nm[0], S.rows)}</span><span class="v">${plural(nm[1], HIT)}</span></div>` : ""}
    <div class="nom"><span class="nt">Лучшая игра</span><span class="lab">Больше всего попаданий за игру</span><span class="v">${s.best}</span></div>
  </div></section>${footer()}`;
}

function viewGame(S, key) {
  const x = allGames().find(z => z.key === key);
  if (!x) return viewSeason(S);
  const m = S.models[x.i], { g, P, teamIds, val, valT, estH } = m;
  const A = approx;
  const who = p => playerLink(p.name, S.rows, p.teams);
  const when = (p, t) => !p.swap ? "" : p.teams[0] === t ? "до смены" : "после смены";
  const inTeam = t => P.filter(p => p.teams.includes(t)).sort((a, b) => a.swap - b.swap);
  const segOf = (p, t) => p.segs.filter(s => s.team === t);
  const swappers = P.filter(p => p.swap);
  // табло
  const board = teamIds.map(t => {
    const mem = inTeam(t), dealt = sum(P, a => sum(P, v => valT(a, v, t)));
    const recv = sum(mem, p => sum(segOf(p, t), s => s.recv)), shots = sum(mem, p => sum(segOf(p, t), s => s.shots)), deaths = sum(mem, p => sum(segOf(p, t), s => s.deaths));
    const won = m.winners.filter(w => w === t).length, tm = [...mem].sort((a, b) => b.mvp - a.mvp)[0];
    const eD = P.some(v => !v.teams.includes(t) && v.est.has("recv") && P.some(a => estH(a, v))), eR = mem.some(p => p.e.recv), eK = mem.some(p => p.e.deaths), eS = mem.some(p => p.e.shots);
    return `<div class="team" style="--c:${TEAMS[t].c}"><div class="team-name"><b>${TEAMS[t].name}</b><span>${mem.map(p => esc(p.name) + (p.swap ? ` (${when(p, t)})` : "")).join(", ")}</span></div>
      <div class="score">${A(eD)}${fmt(dealt)}<small>попаданий</small></div>
      <dl class="kv"><div><dt>Получил</dt><dd>${A(eR)}${fmt(recv)}</dd></div><div><dt>Попал / получил</dt><dd>${A(eD || eR)}${r2(div(dealt, recv))}</dd></div>
      ${m.winners.length ? `<div><dt>Раундов</dt><dd>${won}</dd></div>` : ""}<div><dt>Смертей</dt><dd>${A(eK)}${deaths}</dd></div><div><dt>Выстрелов</dt><dd>${A(eS)}${fmt(shots)}</dd></div><div><dt>Точность</dt><dd>${A(eD || eS)}${pct(div(dealt, shots))}</dd></div></dl>
      ${tm ? `<p class="gmvp"><span class="tag">MVP команды</span>${who(tm)}<span class="muted num">${A(tm.e.mvp)}${fmt(tm.mvp)}</span></p>` : ""}</div>`;
  }).join("");
  const swapNote = swappers.length ? `<p class="note">По ходу игры ${swappers.map(p => esc(p.name)).join(" и ")} ${swappers.length > 1 ? "сменили" : "сменил(а)"} команду${m.swaps.length ? ` после ${m.swaps[0]}-го раунда` : ""}. Попадания, смерти и выстрелы засчитаны той команде, за которую игрок был в тот момент. Цветные точки у имени показывают команды по порядку.</p>` : "";
  // раунды
  let roundsHtml = "";
  if (m.winners.length) {
    const cnt = t => m.winners.filter(w => w === t).length;
    roundsHtml = `<section><h2>Раунды</h2><div class="strip">${m.winners.map((w, i) => (m.swaps.includes(i) ? '<span class="sw" title="Смена составов"></span>' : "") +
      (w === null ? `<i class="unk" title="Раунд ${i + 1}: не определить">${i + 1}</i>` : `<i style="--c:${TEAMS[w].c}" title="Раунд ${i + 1}: ${TEAMS[w].name}">${i + 1}</i>`)).join("")}</div>
      <p class="note">${plural(m.winners.length, ["раунд", "раунда", "раундов"])}, счёт ${teamIds.map(t => `${TEAMS[t].name.toLowerCase()} ${cnt(t)}`).join(" : ")}. Раунды найдены по командам возрождения с пульта. Раунд проигрывает команда, все игроки которой погибли${g.rounds.exact ? "" : "; часть тагеров без журнала, поэтому победитель некоторых раундов определён по выжившим и может быть неточным"}.</p></section>`;
  }
  // повтор боя (бета): есть только для игр с журналами девяток
  const replayHtml = DATA.replays.includes(g.date) ? `<section><h2>Повтор боя <span class="tag">бета</span></h2><div class="replay">
    <p>Бой раунд за раундом в реальном времени: кто в кого попадал, кто кого выбил, первая кровь, лучший игрок раунда и шанс команд на победу по ходу боя.</p>
    <a class="btn main" href="replay.html#${esc(g.date)}">Смотреть повтор</a></div></section>` : "";
  // номинации игры
  const pairs = P.flatMap(a => P.map(v => ({ a, v, n: estH(a, v) ? 0 : val(a, v) })));
  const tp = pairs.reduce((a, y) => y.n > a.n ? y : a, { n: 0 });
  const nomRows = P.map(p => ({ ...p, rounds: p.nR }));
  const extraNom = tp.n ? [`<div class="nom"><span class="nt">Охота открыта</span><span class="lab">Больше всех в одного соперника</span><span class="ws">${who(tp.a)}<span class="muted">→ ${esc(tp.v.name)}</span></span><span class="v">${tp.n}</span></div>`] : [];
  // дуэли
  const maxPair = Math.max(1, ...P.flatMap(a => P.map(v => val(a, v))));
  const coefS = (a, b) => b ? r2(a / b) : "∞";
  const dhd = `<div class="drow hd"><span></span><span class="half lft"><button data-sk="gave">попал</button></span><span class="half rgt"><button data-sk="took">получил</button></span><span class="bal"><button data-sk="tot">всего</button></span><span class="bal"><button data-sk="ratio" aria-pressed="true">коэф.</button></span></div>`;
  const drowsHtml = (rows, mx) => rows.map(r => `<div class="drow" data-gave="${r.gave}" data-took="${r.took}" data-tot="${r.gave + r.took}" data-ratio="${r.took ? r.gave / r.took : 1e9 + r.gave}" title="попал ${r.gave}, получил ${r.took}, всего ${r.gave + r.took}${r.eg || r.et ? " (≈ — оценка)" : ""}"><span class="nm">${esc(r.o.name)}</span><span class="half lft"><span class="num">${A(r.eg)}${r.gave}</span><i style="--c:${r.cp};width:${(r.gave / mx * 72).toFixed(1)}%"></i></span>
        <span class="half rgt"><i style="--c:${r.co};width:${(r.took / mx * 72).toFixed(1)}%"></i><span class="num">${A(r.et)}${r.took}</span></span><span class="bal">${A(r.eg || r.et)}${r.gave + r.took}</span><span class="bal">${A(r.eg || r.et)}${coefS(r.gave, r.took)}</span></div>`).join("");
  const byRatio = rows => rows.sort((a, b) => b.gave / (b.took || .5) - a.gave / (a.took || .5));
  const otherTeam = t => teamIds.find(z => z !== t) ?? t;
  const duels = [...P].sort((a, b) => b.ratio - a.ratio).map(p => {
    let body;
    if (!p.swap) body = dhd + drowsHtml(byRatio(p.foes.map(o => ({ o, gave: val(p, o), took: val(o, p), eg: estH(p, o), et: estH(o, p), cp: TEAMS[p.teams[0]].c, co: TEAMS[o.teams[0]].c }))), maxPair);
    else body = p.teams.map(t => { // сменил команду: отдельный блок за каждую
      const u = otherTeam(t);
      const rows = byRatio(P.filter(o => o !== p).map(o => ({ o, gave: valT(p, o, t), took: valT(o, p, u), cp: TEAMS[t].c, co: TEAMS[u].c })).filter(r => r.gave || r.took));
      const gs = sum(rows, r => r.gave), ks = sum(rows, r => r.took);
      return `<div class="dpart"><div class="dpart-h">${dot(t)}<b>За ${TEAMS[t].name.toLowerCase().replace(/е$/, "х")}</b><span class="muted">${when(p, t)}</span><span class="dpart-s num">${gs} : ${ks} · ${coefS(gs, ks)}</span></div>${dhd}${drowsHtml(rows, maxPair)}</div>`;
    }).join("");
    return `<div class="duel"><div class="duel-head"><div>${who(p)}<span class="duel-sum">попал ${A(p.e.dealt)}${p.dealt} · получил ${A(p.e.recv)}${p.recv}</span></div><div class="ratio">${A(p.e.ratio)}${r2(p.ratio)}<small>попал / получил</small></div></div>
      <div class="drows" data-sortable>${body}</div></div>`;
  }).join("");
  // кто в кого
  const maxT = Math.max(1, ...g.hits.map(h => h[3]));
  const grids = teamIds.map(t => {
    const att = inTeam(t).sort((a, b) => sum(P, v => valT(b, v, t)) - sum(P, v => valT(a, v, t)));
    const vic = P.filter(p => p.teams.some(z => z !== t)).sort((a, b) => sum(P, k => valT(k, b, t)) - sum(P, k => valT(k, a, t)));
    return `<div><div class="cap">${dot(t)}${TEAMS[t].name} стреляют</div><div class="scroll"><table class="mx" style="--c:${TEAMS[t].c}"><thead><tr><th></th>${vic.map(v => `<th>${esc(v.name)}</th>`).join("")}<th>Всего</th></tr></thead>
    <tbody>${att.map(a => `<tr><th>${esc(a.name)}${a.swap ? `<small>${when(a, t)}</small>` : ""}</th>${vic.map(v => { if (a === v) return `<td class="tot">—</td>`; const n = valT(a, v, t), s = n / maxT;
      const e = estH(a, v);
      return `<td class="cell${s > .55 ? " hi" : ""}${e ? " est" : ""}" style="--a:${Math.round(6 + s * 84)}%" title="${esc(a.name)} → ${esc(v.name)}: ${e ? "примерно " : ""}${plural(n, HIT)}">${A(e)}${n}</td>`; }).join("")}<td class="tot">${A(vic.some(v => estH(a, v)))}${sum(vic, v => valT(a, v, t))}</td></tr>`).join("")}</tbody></table></div></div>`;
  }).join("");
  // фраги
  const fr = [...P].sort((a, b) => (b.fragEx + b.fragEs) - (a.fragEx + a.fragEs)), ftop = Math.max(1, ...fr.map(p => p.fragEx + p.fragEs));
  const anyEst = fr.some(p => p.fragEs >= .05);
  const frags = `<div class="frags">${anyEst ? `<div class="flegend"><span><i class="ex"></i>точно по журналу</span><span><i class="es"></i>оценка по попаданиям</span></div>` : ""}
    ${fr.map(p => { const tot = p.fragEx + p.fragEs, est = p.fragEs >= .05;
      return `<div class="frow" style="--c:${TEAMS[p.teams[p.teams.length - 1]].c}">${who(p)}<span class="ftrack"><i class="ex" style="width:${(p.fragEx / ftop * 100).toFixed(1)}%"></i><i class="es" style="width:${(p.fragEs / ftop * 100).toFixed(1)}%"></i></span>
      <span class="ftot">${est ? "~" : ""}${Math.round(tot)}<small>${!est ? "все точные" : p.fragEx ? `${p.fragEx} точно + ~${Math.round(p.fragEs)}` : "оценка"}</small></span></div>`; }).join("")}</div>`;
  // личные счёты
  const tops = (list, f) => { const mx = Math.max(...list.map(f)); return { n: mx, w: list.filter(z => f(z) === mx) }; };
  const feuds = [...P].sort((a, b) => a.teams[0] - b.teams[0] || b.dealt - a.dealt).map(p => {
    if (!p.foes.length) return "";
    const tg = tops(p.foes, v => val(p, v)), nm = tops(p.foes, a => val(a, p));
    const mutual = o => { const ot = tops(o.foes, v => val(o, v)); return ot.w.includes(p); };
    return `<tr><th class="l">${who(p)}</th><td class="l">${tg.w.map(o => `${who(o)}${mutual(o) ? ' <span class="muted">(взаимно)</span>' : ""}`).join(" ")} <span class="muted num">${A(tg.w.some(o => estH(p, o)))}${plural(tg.n, HIT)}</span></td>
      <td class="l">${nm.w.map(who).join(" ")} <span class="muted num">${A(nm.w.some(o => estH(o, p)))}${plural(nm.n, HIT)}</span></td></tr>`;
  }).join("");
  const awards = (g.awards || []).filter(a => a && a[0]);
  return `${header("games")}
  <section><span class="eyebrow">${dateRu(g.date)}</span><h1>${esc(g.title || "Игра " + dateShort(g.date))}</h1>
    ${m.mvp ? `<p class="gmvp"><span class="tag">MVP игры</span>${who(m.mvp)}<span class="muted num">рейтинг ${fmt(m.mvp.mvp)}</span></p>` : ""}</section>
  <section><div class="board">${board}</div>${swapNote}${(g.notes || []).map(n => `<p class="note">${esc(n)}</p>`).join("")}</section>
  ${roundsHtml}
  ${replayHtml}
  <section><div class="head"><h2>Игроки</h2><div class="seg" role="group" aria-label="Режим таблицы"><button data-gmode="tot">Всего</button><button data-gmode="rnd">За раунд</button></div></div><div class="scroll"><table id="gameTable"></table></div><p class="note">Рейтинг MVP — пока простая формула: 100 — средний игрок этой игры. Половина рейтинга — попадания относительно среднего в игре, половина — коэффициент попал / получил относительно среднего (коэффициент выше 3 считается за 3). Например, рейтинг 150 — заметно лучше среднего.</p></section>
  <section><h2>Номинации</h2><div class="noms">${nomTiles(nomRows, who, extraNom)}</div></section>
  ${awards.length ? `<section><h2>Ачивки</h2><div class="awards">${awards.map(([t, names, stat, txt]) => `<div class="award"><span class="nt">${esc(t)}</span><span class="row">${String(names || "").split(",").map(n => n.trim()).filter(Boolean).map(n => { const p = P.find(z => z.name === n); return p ? who(p) : esc(n); }).join(" ")}</span><span class="stat">${esc(stat)}</span><span class="txt">${esc(txt)}</span></div>`).join("")}</div></section>` : ""}
  <section><h2>Дуэли</h2><div class="duels">${duels}</div><p class="note">Заголовки столбцов в карточке сортируют её список. Слева — сколько раз игрок попал в соперника, справа — сколько раз соперник попал в него. «Всего» — сумма, то есть как часто эти двое сходились в бою. У сменивших команду отдельный блок за каждую команду.</p></section>
  <section><h2>Кто в кого</h2><div class="grids">${grids}</div><p class="note">Строка — кто стрелял, столбец — в кого попал.${P.some(p => p.e.recv && p.est.size) ? " Курсивом и «≈» — оценка: тагер не считан, попадания по нему поделены между стрелявшими по тому, как каждый попадал в остальных соперников и как тот попадал в него." : ""}</p></section>
  <section><h2>Фраги</h2>${frags}<p class="note">Фраг засчитан тому, кто попал последним перед смертью. Тагеры 7-го поколения не пишут журнал, их смерти поделены между стрелявшими пропорционально попаданиям с поправкой на то, как часто стрелок добивал.</p></section>
  <section><h2>Личные счёты</h2><div class="scroll"><table><thead><tr><th class="l">Игрок</th><th class="l">Груша для битья</th><th class="l">Личный кошмар</th></tr></thead><tbody>${feuds}</tbody></table></div></section>
  ${state.canEdit ? `<section class="admin"><h3>Управление игрой</h3><div class="row"><a class="btn" href="#edit-${x.key}">Изменить имена, дату и ачивки</a><a class="btn danger" href="https://github.com/${REPO}/delete/${BRANCH}/games/${encodeURIComponent(g.file)}" target="_blank" rel="noopener">Удалить на GitHub</a></div><p class="note">Файл игры: <a href="https://github.com/${REPO}/blob/${BRANCH}/games/${encodeURIComponent(g.file)}" target="_blank" rel="noopener">games/${esc(g.file)}</a>. Править и удалять может только владелец репозитория.</p></section>` : ""}
  ${footer()}`;
}
let gameMode = "tot";
function gameTableInit(S, key) {
  const x = allGames().find(z => z.key === key); if (!x) return;
  const m = S.models[x.i];
  const draw = () => {
    // «За раунд»: попал, получил, смерти и выстрелы делим на число раундов игры, остальное не меняется
    const R = gameMode === "rnd", pr = (p, v) => R ? div(v, p.gr) : v, nf = (v, f) => R ? r2(v) : f(v), max = Math.max(1e-9, ...m.P.map(p => pr(p, p.dealt)));
    document.querySelectorAll("[data-gmode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.gmode === gameMode));
    const cols = [["name", "Игрок", p => p.name], ["dealt", "Попал", p => pr(p, p.dealt)], ["recv", "Получил", p => pr(p, p.recv)], ["ratio", "Попал / получил", p => p.ratio],
      ["deaths", "Смерти", p => pr(p, p.deaths)], ["dpd", "Попал на смерть", p => div(p.dealt, p.deaths)], ["rpd", "Получил на смерть", p => div(p.recv, p.deaths)],
      ["shots", "Выстрелы", p => pr(p, p.shots)], ["acc", "Точность", p => p.acc]];
    const pd = x => isFinite(x) ? one(x) : "∞";
    if (m.winners.length) cols.push(["alive", "Раундов без смерти", p => p.alive]);
    cols.push(["mvp", "Рейтинг", p => p.mvp]);
    sortable("gameTable", cols, m.P, p => `<tr><th class="l"><span class="row" style="gap:6px">${playerLink(p.name, S.rows, p.teams)}<small class="muted num">${esc(p.gun !== p.name ? p.gun : "")}${p.swap ? " · смена команды" : ""}</small></span></th>
      <td class="num barcell">${p.segs.map(s => { const n = sum(m.P, v => m.valT(p, v, s.team)); return `<span class="bar" style="--c:${TEAMS[s.team].c};width:${Math.round(pr(p, n) / max * 80)}px;margin-right:${p.swap ? 1 : 0}px"></span>`; }).join("")}<span style="margin-left:8px">${approx(p.e.dealt)}${nf(pr(p, p.dealt), fmt)}</span></td>
      <td class="num">${approx(p.e.recv)}${nf(pr(p, p.recv), fmt)}</td><td class="num">${approx(p.e.ratio)}${r2(p.ratio)}</td><td class="num">${approx(p.e.deaths)}${nf(pr(p, p.deaths), fmt)}</td><td class="num">${approx(p.e.dealt || p.e.deaths)}${pd(div(p.dealt, p.deaths))}</td><td class="num">${approx(p.e.recv || p.e.deaths)}${pd(div(p.recv, p.deaths))}</td><td class="num">${approx(p.e.shots)}${R ? one(pr(p, p.shots)) : fmt(p.shots)}</td><td class="num">${approx(p.e.acc)}${pct(p.acc)}</td>${m.winners.length ? `<td class="num">${p.alive == null ? "—" : approx(p.e.alive) + p.alive}</td>` : ""}<td class="num">${approx(p.e.mvp)}${fmt(p.mvp)}${m.mvp === p ? " ★" : ""}</td></tr>`, "mvp");
  };
  document.querySelectorAll("[data-gmode]").forEach(b => b.onclick = () => { gameMode = b.dataset.gmode; draw(); });
  draw();
}

// ---------- загрузка и правка ----------
let draft = null; // разобранная, но ещё не опубликованная игра
function knownNames() { // последнее имя для каждого тагера (по MAC)
  const map = {};
  for (const { g } of [...allGames()].reverse()) for (const p of g.players) if (p.name) map[p.key] = p.name;
  return map;
}
function editorHtml(g, title, isNew) {
  const names = knownNames();
  return `${header(isNew ? "upload" : "games")}<section class="admin"><h2>${title}</h2>
    ${isNew ? `<p class="note">Выберите JSON из приложения LT. Сайт посчитает статистику, вы впишете имена и скачаете готовый файл игры. Его нужно загрузить в папку <a href="https://github.com/${REPO}/tree/${BRANCH}/games" target="_blank" rel="noopener">games</a> на GitHub, после этого игра появится на сайте у всех.</p>
    <label>JSON игры из приложения LT<input type="file" id="file" accept=".json,application/json"></label>` : `<p class="note">Поправьте поля и скачайте файл. Затем загрузите его в папку games на GitHub с тем же именем, он заменит старый.</p>`}
    <p class="msg" id="upMsg"></p>
    ${g ? `<div class="fields"><label>Дата<input type="date" id="fDate" value="${esc(g.date)}"></label><label>Название<input id="fTitle" value="${esc(g.title)}" placeholder="Игра ${dateShort(g.date)}"></label></div>
    <div class="scroll"><table><thead><tr><th class="l">Тагер</th><th class="l">Команда</th><th class="l">Игрок</th><th>Выстрелы</th><th>Попал</th></tr></thead><tbody>
    ${g.players.map((p, i) => { const shots = sum(p.segs, s => s.shots), dealt = sum(g.hits.filter(h => h[0] === i), h => h[3]);
      return `<tr><th class="l">${esc(cap(p.gun))} <small class="muted">${p.gen === 8 ? "журнал" : "7 пок."}</small></th><td class="l"><span class="dots">${[...new Set(p.segs.map(s => s.team))].map(dot).join("")}</span></td>
      <td class="l"><input id="n${i}" value="${esc(p.name || names[p.key] || "")}" placeholder="${esc(cap(p.gun))}" aria-label="Игрок на тагере ${esc(p.gun)}"></td>
      <td><input id="s${i}" type="number" min="0" value="${p.shotsAdj ?? shots}" style="width:96px" aria-label="Выстрелы"></td><td class="num">${dealt}</td></tr>`; }).join("")}
    </tbody></table></div>
    <label>Ачивки, по одной в строке: Название | Игроки через запятую | цифры | текст<textarea id="fAw">${esc((g.awards || []).map(a => a.join(" | ")).join("\n"))}</textarea></label>
    <div class="row"><button class="btn main" id="publish">${isNew ? "Скачать файл игры" : "Скачать исправленный файл"}</button><a class="btn" href="#season">Отмена</a></div>
    <p class="note">Выстрелы можно поправить, если тагер посчитал странно; попадания берутся как есть.</p>` : ""}
  </section>${footer()}`;
}
function readForm(g) {
  g.date = document.getElementById("fDate").value || g.date;
  g.title = document.getElementById("fTitle").value.trim();
  g.players.forEach((p, i) => {
    p.name = document.getElementById("n" + i).value.trim();
    const s = +document.getElementById("s" + i).value, raw = sum(p.segs, x => x.shots);
    p.shotsAdj = s >= 0 && s !== raw ? s : null; if (p.shotsAdj == null) delete p.shotsAdj;
  });
  g.awards = document.getElementById("fAw").value.split("\n").map(l => l.split("|").map(s => s.trim())).filter(a => a[0]).map(a => [a[0], a[1] || "", a[2] || "", a[3] || ""]);
  return g;
}
function fileFor(g, isNew) {
  if (!isNew && g.file) return g.file;
  const base = g.date || "game", used = new Set(DATA.games.map(x => x.file));
  let name = base + ".json", n = 2;
  while (used.has(name)) name = `${base}-${n++}.json`;
  return name;
}
function download(name, obj) {
  const { file, ...clean } = obj;
  const url = URL.createObjectURL(new Blob([JSON.stringify(clean, null, 1) + "\n"], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function editorInit(isNew, idx) {
  const msg = document.getElementById("upMsg");
  const file = document.getElementById("file");
  if (file) file.onchange = async () => {
    const f = file.files[0]; if (!f) return;
    msg.className = "msg"; msg.textContent = "Читаю файл…";
    try {
      const g = analyzeExport(JSON.parse(await f.text()));
      g.title = ""; draft = g; render();
    } catch (e) { msg.className = "msg err"; msg.textContent = "Не получилось разобрать файл: " + e.message; }
  };
  const btn = document.getElementById("publish");
  if (btn) btn.onclick = () => {
    const g = readForm(structuredClone(isNew ? draft : DATA.games[idx]));
    const name = fileFor(g, isNew);
    download(name, g);
    const up = `https://github.com/${REPO}/upload/${BRANCH}/games`;
    msg.className = "msg ok";
    msg.innerHTML = `Файл <b>${esc(name)}</b> скачан. Теперь <a href="${up}" target="_blank" rel="noopener">загрузите его в папку games на GitHub</a> и нажмите Commit changes.
      ${isNew ? "" : "Имя файла то же, поэтому он заменит старую версию."} Сайт обновится сам через минуту-две.`;
  };
}

// ---------- загрузка игр ----------
async function loadGames() {
  const bust = "?t=" + Date.now();
  let list = null;
  try { // список, собранный при деплое
    const r = await fetch("games/index.json" + bust, { cache: "no-store" });
    if (r.ok) list = (await r.json()).map(x => ({ file: x.file, url: "games/" + encodeURIComponent(x.file) + "?v=" + (x.v || "") }));
  } catch (e) {}
  if (!list) { // запасной путь: содержимое папки через GitHub API
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/games?ref=${BRANCH}`);
    if (!r.ok) throw new Error("не удалось получить список игр (" + r.status + ")");
    list = (await r.json()).filter(x => x.type === "file" && /\.json$/i.test(x.name) && x.name !== "index.json").map(x => ({ file: x.name, url: x.download_url }));
  }
  const games = await Promise.all(list.map(async x => {
    try { const r = await fetch(x.url); if (!r.ok) return null; const g = await r.json(); return g && Array.isArray(g.players) && Array.isArray(g.hits) ? { ...g, file: x.file } : null; }
    catch (e) { return null; }
  }));
  try { const r = await fetch("replays/index.json" + bust, { cache: "no-store" }); if (r.ok) DATA.replays = await r.json(); } catch (e) {}
  DATA.games = games.filter(Boolean).sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.file.localeCompare(b.file));
}

// ---------- маршрутизация ----------
function render() {
  const S = season(), h = (location.hash || "#season").slice(1);
  let html, after = () => {};
  if (h === "games") html = viewGames(S);
  else if (h === "players") { html = viewPlayers(S); after = () => seasonTableInit(S); }
  else if (/^p\d+$/.test(h)) { const s = S.rows.find(r => r.key === h); html = viewPlayer(S, h); after = () => { progressInit(); if (s && s.byCls && s.byCls.auto && s.byCls.pistol) statTable("pClsTable", statCols(["name", "Оружие", r => CLS[r.cls]], true), [s.byCls.auto, s.byCls.pistol], r => CLS[r.cls], "games");
      if (s) statTable("pGunTable", statCols(["name", "Пушка", r => r.gun.name]), s.gunList, r => gunLink(r.gun), "games"); }; }
  else if (h === "perdeath") { html = viewPerDeath(S); after = () => perDeathInit(S); }
  else if (h === "guns") { html = viewGuns(S); after = () => gunsInit(S); }
  else if (/^gun\d+$/.test(h)) { const g = S.guns.find(z => z.key === h); html = viewGun(S, h); after = () => g && statTable("gunPlayers", statCols(["name", "Игрок", r => r.name]), g.players, r => playerLink(r.name, S.rows, []), "ratio"); }
  else if (h.startsWith("game-")) { html = viewGame(S, h); after = () => gameTableInit(S, h); }
  else if (h === "upload" && state.canEdit) { html = editorHtml(draft, "Добавить игру", true); after = () => editorInit(true); }
  else if (h.startsWith("edit-") && state.canEdit) { const x = allGames().find(z => z.key === h.slice(5)); html = x ? editorHtml(DATA.games[x.i], "Изменить игру", false) : viewSeason(S); after = () => x && editorInit(false, x.i); }
  else { html = viewSeason(S); after = () => { seasonTableInit(S); nomsInit(); }; }
  app.innerHTML = html; after();
}
addEventListener("hashchange", () => { render(); scrollTo(0, 0); });
app.innerHTML = `<div class="empty">Загружаю игры…</div>`;
loadGames().then(render, e => { render(); app.insertAdjacentHTML("afterbegin", `<p class="msg err">Не получилось загрузить игры: ${esc(e.message)}. Обновите страницу через минуту.</p>`); });

// ---------- эффекты оформления: подсветка карточек под курсором и отсчёт больших чисел ----------
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const countUp = () => {
    if (calm) return;
    app.querySelectorAll(".fact .v, .score").forEach(el => {
      const node = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      if (!node || node.__done) return;
      const raw = node.textContent, target = +raw.replace(/[\s  ]/g, "");
      if (!Number.isInteger(target) || target < 2) return;
      node.__done = true; const t0 = performance.now(), dur = 900;
      const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        node.textContent = k < 1 ? fmt(target * e) : raw; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  };
  new MutationObserver(countUp).observe(app, { childList: true });
  const SPOT = ".gcard, .duel, .nom, .fact, .frags, .team, .award";
  addEventListener("pointermove", e => {
    const el = e.target.closest && e.target.closest(SPOT); if (!el) return;
    const r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });
})();

// Сортировка дуэлей игрока по заголовкам: повторный клик меняет направление
app.addEventListener("click", e => {
  const b = e.target.closest(".drows[data-sortable] .drow.hd button"); if (!b) return;
  const box = b.closest(".dpart") || b.closest(".drows"), k = b.dataset.sk, desc = !(b.getAttribute("aria-pressed") === "true" && b.dataset.dir !== "asc");
  box.querySelectorAll(".drow.hd button").forEach(x => { x.setAttribute("aria-pressed", x === b); delete x.dataset.dir; });
  b.dataset.dir = desc ? "desc" : "asc";
  const rows = [...box.querySelectorAll(".drow:not(.hd)")].sort((x, y) => (desc ? -1 : 1) * (x.dataset[k] - y.dataset[k]) || (y.dataset.tot - x.dataset.tot));
  box.append(...rows);
});

// «Главные противостояния»: переключатель «Пары / По игрокам»
app.addEventListener("click", e => {
  const b = e.target.closest("[data-dmode]"); if (!b) return;
  const sec = b.closest("section");
  sec.querySelectorAll("[data-dmode]").forEach(x => x.setAttribute("aria-pressed", x === b));
  sec.querySelectorAll("[data-dpane]").forEach(el => el.hidden = el.dataset.dpane !== b.dataset.dmode);
});

// Сортировка «Главных противостояний»: по сумме, в среднем за игру или по коэффициенту; видны первые 10, «Все пары» раскрывает список
app.addEventListener("click", e => {
  const box = e.target.closest(".frags[data-psort]"); if (!box) return;
  const rows = () => [...box.querySelectorAll(".prow:not(.hd)")];
  if (e.target.closest(".pmore")) { box.dataset.all = "1"; rows().forEach(r => r.hidden = false); e.target.closest(".pmore").remove(); return; }
  const b = e.target.closest(".prow.hd button"); if (!b) return;
  const k = b.dataset.sk, desc = !(b.getAttribute("aria-pressed") === "true" && b.dataset.dir !== "asc");
  box.querySelectorAll(".prow.hd button").forEach(x => { x.setAttribute("aria-pressed", x === b); delete x.dataset.dir; });
  b.dataset.dir = desc ? "desc" : "asc";
  const sorted = rows().sort((x, y) => (desc ? -1 : 1) * (x.dataset[k] - y.dataset[k]) || (y.dataset.n - x.dataset.n));
  sorted.forEach((r, i) => r.hidden = !box.dataset.all && i >= 10);
  box.querySelector(".prow.hd").after(...sorted);
});
