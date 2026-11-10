// Лазертаг · новый сайт. Один экран из четырёх блоков (Главная, Игры, Игроки, Пушки) и страницы разборов: игра, игрок, пушка.
const REPO = "Alanvoll/Lasertag";
const ROOT = "../"; // новый дизайн лежит в /new/, игры берутся из общих games/ и replays/ основного сайта
// Данные: games/*.json (список в games/index.json), модель — model.js (та же, что на старом сайте).

// ---------- аватары ----------
// выбор игроков на странице персонажей (/chars/): имя → номер персонажа; остальным — общий шаблон «Дым»
const AVA_SET = { "Арсений": "a25", "Глеб": "a30", "Антон": "a56", "Лина": "a83", "Петя": "a86", "Данила": "a87", "Евгений": "a88" };
const portrait = n => AVA_SET[n] ? `art/av/${AVA_SET[n]}.webp` : `art/av/unknown.jpg`, figure = n => AVA_SET[n] ? `art/body/${AVA_SET[n]}.webp` : `art/body/unknown.webp`;
const TEAM_HEX = { 0: "var(--red)", 1: "var(--blue)", 2: "var(--yellow)", 3: "var(--green)" };
const tc = t => TEAM_HEX[t];
// арт пушек (10.11): у каждой модели свой рисунок; все «фениксы» — одна модель, «акашка» — прежнее имя Хищника
const GUN_ART = [["p90", "p90"], ["винторез", "vintorez"], ["пистолет", "pistol"], ["феникс", "phoenix"], ["ar15", "ar15"], ["скорпион", "scorpion"], ["комар", "komar"], ["гадюка", "gadyuka"], ["хищник", "predator"], ["акашка", "predator"], ["аксу", "aksu"]];
const gunArt = g => { const n = (g.name || "").toLowerCase(), f = GUN_ART.find(([k]) => n.includes(k)); return `art/gun/${f ? f[1] : g.cls === "pistol" ? "unknown-pistol" : "unknown-rifle"}.webp`; };
const PLACE_ART = { "Склады": ["art/place/sklady-1.webp", "art/place/sklady-2.webp"], "Зубр": ["art/place/zubr-1.webp", "art/place/zubr-2.webp"] };
// у каждой площадки несколько картинок: игра берёт свою по дате, чтобы соседние игры отличались
const placeArt = (l, key = "") => { const a = PLACE_ART[l]; if (!a) return "art/place/empty.webp"; let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return a[h % a.length]; };

const ru = n => Math.round(n).toLocaleString("ru-RU");
// месяцы не сокращаем нигде: либо слово целиком, либо число
const dDay = d => { const [y, m, dd] = (d || "").split("-").map(Number); return { day: dd, monFull: MONTHS[m - 1], y }; };
const A = approx;
// иконки показателей: тонкая угловатая линия в цвет текста
const ICONS = {
  star: ["Рейтинг", `<path d="M12 2.8l2.7 6 6.5.7-4.9 4.4 1.4 6.4-5.7-3.3-5.7 3.3 1.4-6.4-4.9-4.4 6.5-.7z"/>`],
  hit: ["Попал", `<circle cx="12" cy="12" r="6.5"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/><rect x="11" y="11" width="2" height="2" fill="currentColor" stroke="none"/>`],
  recv: ["Получил", `<path d="M12 2.5l8 3v6.2c0 4.6-3.2 8-8 9.8-4.8-1.8-8-5.2-8-9.8V5.5z"/><path d="M9 9l6 6M15 9l-6 6"/>`],
  death: ["Смерти", `<path d="M5 11a7 7 0 0114 0v4.5h-2.5V19h-9v-3.5H5z"/><rect x="8.3" y="10" width="2.4" height="2.4" fill="currentColor" stroke="none"/><rect x="13.3" y="10" width="2.4" height="2.4" fill="currentColor" stroke="none"/><path d="M10.5 19v-2M13.5 19v-2"/>`],
  shot: ["Выстрелы", `<path d="M9 21.5V9.5c0-3.5 1.2-6 3-7.5 1.8 1.5 3 4 3 7.5v12z"/><path d="M9 17.5h6M9 10.5h6"/>`],
  acc: ["Точность", `<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>`],
  round: ["Раунды", `<path d="M5 22V3M5 4h13l-3 4.5 3 4.5H5"/>`],
  ppl: ["Игроки", `<circle cx="12" cy="7.5" r="4"/><path d="M4 21.5v-2.5c0-3 2.5-5 5.5-5h5c3 0 5.5 2 5.5 5v2.5"/>`],
};
const ic = (k, t) => `<svg class="ic" viewBox="0 0 24 24" aria-label="${t || ICONS[k][0]}"><title>${t || ICONS[k][0]}</title>${ICONS[k][1]}</svg>`;
const st = (k, v) => `<i class="st">${ic(k)}${v}</i>`;

const genLabel = g => [g.name.toLowerCase().includes(CLS1[g.cls]) ? "" : CLS1[g.cls], g.gen === 8 ? "журнал" : "7 пок."].filter(Boolean).join(" · ");
const pLink = (name, S) => { const s = S.rows.find(r => r.name === name); return s ? `<a class="pl" href="#${s.key}">${esc(name)}</a>` : esc(name); };
const gLink = g => g ? `<a class="pl" href="#${g.key}">${esc(g.name)}</a>` : "";
const panel = (cls, inner, tag = "div", attrs = "") => `<${tag} class="panel draw ${cls}" ${attrs}><div class="c"></div><i class="pg"></i>${inner}</${tag}>`;

// ---------- общая сводка ----------
function homeData(S) {
  const models = [...S.models].sort((a, b) => (b.g.date || "").localeCompare(a.g.date || ""));
  const rounds = sum(models, m => m.winners.length), hits = sum(models, m => sum(m.P, p => p.dealt)), shots = sum(models, m => sum(m.P, p => p.shots));
  const minG = 3;
  const top = S.rows.filter(r => r.games >= minG).map(r => ({ r, name: r.name, games: r.games, rating: r.mvp / r.games, ratio: r.ratio, acc: r.acc, mvps: r.mvps, perGame: r.dealt / r.games })).sort((a, b) => b.rating - a.rating);
  let duel = null;
  for (const r of S.rows) for (const [o, x] of Object.entries(r.pairs)) { const y = r.against[o] || 0; if (r.name < o && (!duel || x + y > duel.total)) duel = { a: r.name, b: o, ab: x, ba: y, total: x + y, meet: (r.meet || {})[o] || 0 }; }
  return { models, rounds, hits, acc: div(hits, shots), locs: [...new Set(models.map(m => m.g.location).filter(Boolean))], first: models[models.length - 1].g.date, last: models[0], top, duel };
}
function gameCard(m) {
  const sc = scoreOf(m), hitsT = Object.fromEntries(hitsOf(m));
  const teams = m.teamIds.map(t => { const mem = m.P.filter(p => p.teams.includes(t) && m.shareT(p, t) > .5).sort((a, b) => m.mvpT(b, t) - m.mvpT(a, t)); // MVP команды — кто больше всех сделал именно за неё, среди сыгравших за неё большую часть игры
    return { t, name: TEAMS[t].name, score: (sc.parts.find(x => x[0] === t) || [0, 0])[1], hits: hitsT[t] || 0, mvp: mem[0] ? mem[0].name : "", mvpDealt: mem[0] ? sum(m.P, v => m.valT(mem[0], v, t)) : 0, n: m.P.filter(p => p.teams.includes(t)).length }; });
  const win = [...teams].sort((a, b) => b.score - a.score)[0].t;
  return { m, key: gameKey(m.g), date: m.g.date, loc: m.g.location || "", kind: sc.kind, teams, win, rounds: m.winners.length, players: m.P.length, hits: sum(teams, t => t.hits), top: m.mvp.name, awards: m.g.awards || [], winners: m.winners, swaps: m.swaps };
}
const roundsStrip = (g, big = false) => `<span class="rounds${big ? " big" : ""}">${g.winners.map((w, i) => (g.swaps.includes(i) ? `<i class="sw"></i>` : "") + (w == null ? `<i class="none">${big ? i + 1 : ""}</i>` : `<i style="--c:${tc(w)}" title="Раунд ${i + 1}">${big ? i + 1 : ""}</i>`)).join("")}</span>`;
// попадания команд рядом со счётом: счёт по раундам часто перекошен сильнее, чем сама перестрелка
const teamHits = g => g.kind === "попадания" ? "" : `<small class="th num"><span><b style="color:${tc(g.teams[0].t)}">${ru(g.teams[0].hits)}</b></span><i>${ic("hit", "попаданий")}</i><b style="color:${tc(g.teams[1].t)}">${ru(g.teams[1].hits)}</b></small>`;
// счёт всегда двузначный, как на табло: у однозначного впереди приглушённый ноль
const sn = n => n >= 0 && n < 10 ? `<s class="z0">0</s>${n}` : ru(n);
const scoreHtml = (g, cls = "sc", hits) => `<div class="${cls} num"><span style="color:${tc(g.teams[0].t)}">${sn(g.teams[0].score)}</span><i>:</i><span style="color:${tc(g.teams[1].t)}">${sn(g.teams[1].score)}</span>${g.kind === "попадания" ? `<small>попадания</small>` : ""}${cls === "sc" && hits ? teamHits(g) : ""}</div>`;


const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const monthKey = d => (d || "").slice(0, 7), monthName = d => { const [y, m] = (d || "").split("-").map(Number); return `${MONTHS_NOM[m - 1]} ${y}`; };
function gameTile(g, k = 0) {
  const d = dDay(g.date);
  const duo = mvpDuo(g), pl = n => plural(n, ["игрок", "игрока", "игроков"]);
  const tt = (x, cls) => { const d = duo.find(z => z.t === x.t); return `<div class="${cls}"><div class="t${x.t === g.win ? " w" : ""}" style="--c:${tc(x.t)}">${pl(x.n)}</div><div class="mv"><img src="${portrait(d.name)}" alt=""><span><b>${esc(d.name)}</b><small>${mvpTitle(d)}</small><small class="sts">${st("star", ru(d.rating))}${st("hit", d.dealt)}</small></span></div></div>`; };
  return panel("gcard A", `<div class="d"><b>${d.day} ${d.monFull}</b><span class="mono">${esc(g.loc)}</span></div>${scoreHtml(g, "sc", true)}<div class="tt">${tt(g.teams[0], "")}${tt(g.teams[1], "r")}</div><div class="ft">${roundsStrip(g)}${teamHits(g) ? "" : `<span class="mono sts">${st("hit", ru(g.hits))}</span>`}</div>`, "a", `href="#${g.key}" style="--k:${Math.min(k, 8)}" data-loc="${esc(g.loc)}"`);
}
// карточки ленты игр: «Постер» — арт площадки сверху, под ним дата и счёт
const GM = "5";
function miniStrip(cards, cur) {
  let html = "", mk = "";
  cards.forEach((g, i) => { const d = dDay(g.date), rw = n => plural(n, ["раунд", "раунда", "раундов"]); if (monthKey(g.date) !== mk) { mk = monthKey(g.date); html += `<div class="gmon"><span>${monthName(g.date).split(" ")[0]}</span></div>`; }
    html += `<a class="gmini${g.key === cur ? " cur" : ""}" href="#${g.key}" data-key="${g.key}" style="--k:${Math.min(i, 10)};--img:url(${placeArt(g.loc, g.date)})"><span class="dt"><b>${dateShort(g.date).slice(0, 5)}</b></span><span class="pl mono">${esc(g.loc)}</span><span class="s num"><span style="color:${tc(g.teams[0].t)}">${sn(g.teams[0].score)}</span><i>:</i><span style="color:${tc(g.teams[1].t)}">${sn(g.teams[1].score)}</span>${teamHits(g)}</span><span class="r mono">${vsHtml(g)}${g.kind === "попадания" ? " · по попаданиям" : ""}</span><span class="sb">${g.teams.map(t => `<i style="flex:${t.score};background:${tc(t.t)}"></i>`).join("")}</span></a>`; });
  return html;
}
// два MVP на игру: лучший в каждой команде; тот из них, кто MVP игры, получает титул «MVP игры» вместо «MVP команды».
// если MVP игры менял команду и не лучший ни в одной, он занимает место в команде, за которую сыграл больше
function mvpDuo(G, pure) { // pure — только MVP команд, без подстановки MVP игры на место MVP команды
  const m = G.m, top = m.mvp;
  const duo = G.teams.map(t => { const p = m.P.find(x => x.name === t.mvp); return { t: t.t, name: t.mvp, rating: p ? p.mvp : 0, dealt: p ? p.dealt : t.mvpDealt, game: p === top }; }); // цифры игрока — за всю игру, даже если он менял команду
  if (!pure && top && !duo.some(d => d.game)) { const tt = [...top.teams].sort((a, b) => m.shareT(top, b) - m.shareT(top, a))[0], d = duo.find(x => x.t === tt) || duo[0]; Object.assign(d, { name: top.name, rating: top.mvp, dealt: top.dealt, game: true }); }
  return duo;
}
const mvpTitle = d => d.game ? "MVP игры" : "MVP команды";
const vsHtml = g => `<b style="color:${tc(g.teams[0].t)}">${g.teams[0].n}</b> vs <b style="color:${tc(g.teams[1].t)}">${g.teams[1].n}</b>`;
// ---------- блок «Игры» на главной: большая карточка последней игры (варианты G / H / I) + лента игр ----------
let GV = "r"; // большая карточка игры: выбрана «Диаграмма»
const pw = (n, w) => plural(n, w).split(" ")[1];
const teamStats = (S, G) => { const m = G.m; return G.teams.map(t => { const sg = m.P.flatMap(p => (p.segs || []).filter(x => x.team === t.t)), shots = sum(sg, x => x.shots || 0), deaths = sum(sg, x => x.deaths || 0); return { hits: t.hits, shots, deaths, acc: div(t.hits, shots), hd: div(t.hits, deaths), rt: sum(m.P.filter(p => p.teams.includes(t.t)), p => m.mvpT(p, t.t)),
      rs: sum(m.P.filter(p => p.teams.includes(t.t)), p => { const r = S.rows.find(x => x.name === p.name); return r && r.games ? r.mvp / r.games * m.shareT(p, t.t) : 0; }) }; }); }; // rs — сумма средних рейтингов игроков за все игры
let GR = (() => { try { return localStorage.getItem("lt-gr") === "p" ? "p" : "l"; } catch (e) { return "l"; } })(); // состав в большой карточке: l — списком, p — портретами
function gameBig(S, G) {
  const m = G.m, dG = dDay(G.date), key = n => (S.rows.find(r => r.name === n) || {}).key || G.key, duo = mvpDuo(G);
  const tag = `<div class="mono"><span class="blink"></span>${G.last === false ? "" : "последняя игра · "}${esc(G.loc)}</div>`;
  const meta = `<div class="mono gb-meta">${G.kind === "попадания" ? "счёт по попаданиям · " : ""}${vsHtml(G)}${G.rounds ? ` · <b>${G.rounds}</b> ${pw(G.rounds, ["раунд", "раунда", "раундов"])}` : ""} · <b>${ru(G.hits)}</b> ${pw(G.hits, ["попадание", "попадания", "попаданий"])}</div>`;
  const score = `<div class="gb-s">${G.teams.map(t => `<div class="lgn num" style="--c:${tc(t.t)}">${sn(t.score)}</div>`).join(`<i class="lgx"><b></b><b></b></i>`)}${teamHits(G)}</div>`;
  const chip = d => `<a class="gbm${d.game ? " g" : ""}" href="#${key(d.name)}" style="--c:${tc(d.t)}"><img src="${portrait(d.name)}" alt=""><span><small>${mvpTitle(d)}</small><b>${esc(d.name)}</b><em class="sts">${st("star", ru(d.rating))}${st("hit", d.dealt)}</em></span></a>`;
  const card = d => `<a class="le-c${d.game ? " g" : ""}" href="#${key(d.name)}" style="--c:${tc(d.t)}"><img src="${portrait(d.name)}" alt=""><span><small>${mvpTitle(d)}</small><b>${esc(d.name)}</b><em class="sts">${st("star", ru(d.rating))}${st("hit", d.dealt)}</em></span></a>`;
  const rounds = G.winners.length ? `<div class="rlog fill gbr"><span class="mono">раунды</span>${roundsStrip(G)}<a class="lnk mono" href="#${G.key}">разбор игры →</a></div>` : `<div class="rlog"><a class="lnk mono" href="#${G.key}">разбор игры →</a></div>`;
  const bg = `<div class="bgimg" style="--img:url(${placeArt(G.loc, G.date)})"></div>`;
  const gs = { hits: sum(m.P, p => p.dealt), shots: sum(m.P, p => p.shots), deaths: sum(m.P, p => p.deaths) };
  const kv = [[ru(gs.hits), "попаданий", "hit"], [pct(div(gs.hits, gs.shots)), "точность", "acc"], [ru(gs.deaths), "смертей", "death"], [ru(gs.shots), "выстрелов", "shot"]].map(([v, l, i]) => `<div><b>${v}</b><span>${ic(i)}${l}</span></div>`).join("");
  let v = GV, body; if (v === "i" && (!G.winners.length || G.kind === "попадания")) v = "h";
  const head = `${tag}<h3>${dG.day} ${dG.monFull}</h3>`, c0 = tc(G.teams[0].t), c1 = tc(G.teams[1].t);
  if (v === "k" || v === "x" || v === "y" || v === "z" || v === "r") { // «Табло»: половины в цветах команд и сравнение команд по цифрам; «Дуэль + табло»: то же между двумя портретами MVP
    const ts = teamStats(S, G);
    const row = (k, l, f, i, low) => { const a = ts[0][k] || 0, b = ts[1][k] || 0, mx = Math.max(a, b) || 1, w = a === b || low === 0 ? -1 : (a > b) !== !!low ? 0 : 1;
      return `<div class="gk-row"><b${w === 1 ? ` class="lo"` : ""}>${f(a)}</b><i class="l" style="--w:${a / mx * 100}%;--c:${c0}"></i><span>${ic(i)}${l}</span><i style="--w:${b / mx * 100}%;--c:${c1}"></i><b${w === 0 ? ` class="lo"` : ""}>${f(b)}</b></div>`; };
    const rows = `<div class="gk-c">${row("rs", "в среднем за все игры", ru, "star")}${row("rt", "в этой игре", ru, "star")}${row("hits", "попаданий", ru, "hit")}${row("acc", "точность", pct, "acc")}${row("hd", "попаданий на смерть", one, "hit")}${row("deaths", "смертей", ru, "death", 1)}${row("shots", "выстрелов", ru, "shot", 0)}</div>`;
    const dq = v === "k" ? duo : mvpDuo(G, true), gm = p => p === m.mvp && !dq.some(d => d.game); // в x/y портреты всегда у MVP команд; MVP игры, если он не один из них, отмечен в составе
    // сколько раундов игрок, менявший команду, сыграл за эту команду
    const rn = (p, t) => { if (!p.swap || !p.segRounds) return null; const n = q => sum(q, ([a, b]) => b - a + 1); return [n(p.segRounds.filter((_, k) => p.segs[k].team === t)), n(p.segRounds)]; };
    const rb = (p, t) => { const r = rn(p, t); if (!r && p.swap) return `<i class="rb" title="За эту команду сыграл примерно ${pct(m.shareT(p, t))} игры (по выстрелам, раунды не записаны)">${ic("round")}≈${Math.round(m.shareT(p, t) * 100)}%</i>`; return r ? `<i class="rb" title="За эту команду сыграл ${plural(r[0], ["раунд", "раунда", "раундов"])} из ${r[1]}">${ic("round")}${r[0]}/${r[1]}</i>` : ""; };
    // средний рейтинг игрока за прошлые игры и на сколько эта игра его сдвинула
    const shift = p => { const xs = S.models.filter(x => (x.g.date || "") < (G.date || "")).map(x => x.P.find(q => q.name === p.name)).filter(Boolean).map(q => q.mvp); if (!xs.length) return null; const b = sum(xs, x => x) / xs.length, a = (b * xs.length + p.mvp) / (xs.length + 1); return { b, d: Math.round(a) - Math.round(b) }; };
    const cardR = k => { const d = dq[k], p = m.P.find(x => x.name === d.name), sh = p && shift(p); let h = card(d).replace("<span>", (p ? rb(p, d.t) : "") + "<span>");
      if (sh && (v === "z" || v === "r")) h = h.replace(/(<i class="st">.*?<\/i>)/, `$1<i class="dl ${sh.d > 0 ? "up" : sh.d < 0 ? "dn" : ""}" title="До игры в среднем ${ru(sh.b)}, эта игра сдвинула среднее на ${sh.d > 0 ? "+" : ""}${sh.d}">${sh.d > 0 ? "+" : sh.d < 0 ? "−" : ""}${Math.abs(sh.d)}</i>`); return h; };
    // остальные игроки команды (без тех, кто на портретах) с рейтингом, лучшие сверху
    const rest = k => { const t = G.teams[k].t, L = m.P.filter(p => p.teams.includes(t) && p.name !== dq[k].name).sort((a, b) => (m.shareT(b, t) > .5) - (m.shareT(a, t) > .5) || b.mvp - a.mvp), g = p => m.shareT(p, t) <= .5 ? " sw" : ""; // sw — менял команду и за эту сыграл меньшую часть игры
      return v !== "x" && !(GR === "l" && (v === "z" || v === "r")) ? `<div class="gy-l${k ? " r" : ""}${v === "y" ? (L.length > 6 ? " many" : L.length > 4 ? " tight" : "") : ` gz-l c${L.length > 8 ? 5 : L.length > 6 ? 4 : L.length > 4 ? 3 : 2}`}" style="--c:${tc(t)}">${L.map(p => `<a class="gy-c${g(p)}${gm(p) ? " g" : ""}" href="#${key(p.name)}">${rb(p, t)}<img src="${portrait(p.name)}" alt=""><span>${gm(p) ? `<small>MVP игры</small>` : ""}<b>${esc(p.name)}</b>${st("star", ru(p.mvp))}</span></a>`).join("")}</div>`
        : `<div class="gx-l${k ? " r" : ""}${L.length > 7 ? " d" : ""}" style="--c:${tc(t)}"><div class="gx-h"><b></b><span></span><span class="rr"><i>до игры</i><i>в игре</i><i></i></span></div>${L.map(p => { const d = shift(p); return `<a class="${g(p).trim()}" href="#${key(p.name)}"><img src="${portrait(p.name)}" alt=""><span>${esc(p.name)}${rb(p, t)}${gm(p) ? `<small>MVP игры</small>` : ""}</span><span class="rr num"><i class="b0" title="Средний ${"\u2605"} за прошлые игры">${d ? ru(d.b) : "—"}</i>${st("star", ru(p.mvp))}${d ? `<i class="dl ${d.d > 0 ? "up" : d.d < 0 ? "dn" : ""}" title="На сколько эта игра сдвинула средний ${"\u2605"}">${d.d > 0 ? "+" : d.d < 0 ? "−" : ""}${Math.abs(d.d)}</i>` : `<i class="dl"></i>`}</span></a>`; }).join("")}</div>`; };
    const side = (k, r) => `<div class="gk-t${r}"><div class="lgn num" style="--c:${tc(G.teams[k].t)}">${sn(G.teams[k].score)}</div>${chip(duo[k])}</div>`;
    // «Без полос»: цифры команд вплотную к подписи, составы крупными портретами по бокам; «Диаграмма»: вместо цифр две фигуры команд одна на другой
    const zr = [["rs", "в среднем за все игры", ru, "star"], ["rt", "в этой игре", ru, "star"], ["acc", "точность", pct, "acc"], ["hd", "попаданий на смерть", one, "hit"], ["deaths", "смертей", ru, "death", 1], ["shots", "выстрелов", ru, "shot", 0]];
    const zrows = () => `<div class="gz-c">${zr.map(([k, l, f, i, low]) => { const a = ts[0][k] || 0, b = ts[1][k] || 0, w = a === b || low === 0 ? -1 : (a > b) !== !!low ? 0 : 1; return `<div class="gz-row"><b${w === 1 ? ` class="lo"` : ""}>${f(a)}</b><span>${ic(i)}${l}</span><b${w === 0 ? ` class="lo"` : ""}>${f(b)}</b></div>`; }).join("")}</div>`;
    const radar = () => { const ax = [["hits", "попаданий", ru, "hit"], ...zr].filter(d => d[0] !== "rs").map(d => d[0] === "hd" ? ["hd", "на смерть", one, "hit"] : d), n = ax.length, R = 100, pt = (k, r) => { const a = -Math.PI / 2 + k * 2 * Math.PI / n; return [Math.cos(a) * r, Math.sin(a) * r]; };
      // шкала каждой оси: от худшего до лучшего значения команды среди всех игр (попадания, смерти и выстрелы в пересчёте на раунд), у смертей лучше меньшее.
      // так фигура победителя не превращается в полный многоугольник, а показывает, насколько сильной была игра команды на фоне остальных
      const nr = g => g.rounds || (g.m.P[0] || {}).gr || 1, per = { hits: 1, deaths: 1, shots: 1 }, q = (g, x, k) => (x[k] || 0) / (per[k] ? nr(g) : 1);
      const all = S._ts || (S._ts = S.models.map(mm => { const g = gameCard(mm); return { g, ts: teamStats(S, g) }; }));
      const val = (t, [k, , , , low]) => { const xs = all.flatMap(o => o.ts.map(x => q(o.g, x, k))), lo = Math.min(...xs), hi = Math.max(...xs), x = q(G, ts[t], k), p = hi > lo ? (x - lo) / (hi - lo) : 1; return .18 + .82 * (low ? 1 - p : p); };
      const poly = t => ax.map((d, k) => pt(k, R * val(t, d)).map(x => x.toFixed(1)).join(",")).join(" ");
      const ring = r => `<polygon points="${ax.map((_, k) => pt(k, R * r).map(x => x.toFixed(1)).join(",")).join(" ")}"/>`;
      return `<div class="gr"><svg viewBox="-104 -104 208 208" aria-hidden="true"><g class="gr-g">${[.25, .5, .75, 1].map(ring).join("")}${ax.map((_, k) => { const [x, y] = pt(k, R); return `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("")}</g>
        <polygon class="gr-p" style="--c:${c0}" points="${poly(0)}"/><polygon class="gr-p" style="--c:${c1}" points="${poly(1)}"/></svg>
        ${ax.map(([k, l, f, i], j) => { const [x, y] = pt(j, 1); return `<span class="gr-l${Math.abs(x) < .01 ? (y > 0 ? " s" : " m") : x > 0 ? " e" : " w"}" style="left:${(50 + x * 50).toFixed(1)}%;top:${(50 + y * 50).toFixed(1)}%"><small>${ic(i)}${l}</small>${k === "hits" && G.kind !== "попадания" ? "" : `<em><b style="color:${c0}">${f(ts[0][k] || 0)}</b><b style="color:${c1}">${f(ts[1][k] || 0)}</b></em>`}</span>`; }).join("")}</div>`; };
    body = v === "z" || v === "r" ? `<div class="gq gq-${v}" style="--c0:${c0};--c1:${c1}"><div class="gq-s">${cardR(0)}${rest(0)}</div><div class="gq-m"><div class="gx-c"><div class="gk-h">${head}</div>${score}</div>${v === "z" ? zrows() : radar()}</div><div class="gq-s r">${cardR(1)}${rest(1)}</div></div>${rounds}`
      : v === "y" ? `<div class="gx gy" style="--c0:${c0};--c1:${c1}">${cardR(0)}<div class="gx-m"><div class="gx-c"><div class="gk-h">${head}</div>${score}</div>${rows}<div class="gy-r">${rest(0)}${rest(1)}</div></div>${cardR(1)}</div>${rounds}`
      : v === "x" ? `<div class="gx" style="--c0:${c0};--c1:${c1}">${cardR(0)}<div class="gx-m"><div class="gx-t">${rest(0)}<div class="gx-c"><div class="gk-h">${head}</div>${score}</div>${rest(1)}</div>${rows}</div>${cardR(1)}</div>${rounds}`
      : `<div class="gk" style="--c0:${c0};--c1:${c1}"><div class="gk-h">${head}<div class="mono gb-meta">${vsHtml(G)}${G.kind === "попадания" ? " · счёт по попаданиям" : ""}</div></div>${side(0, "")}${rows}${side(1, " r")}</div>${rounds}`;
  } else if (v === "i") { // «Ход игры»: протокол по раундам — у победителя раунда закрашена клетка с его новым счётом
    const W = G.winners, T = G.teams.map(t => t.t), c = [0, 0], cells = [[], []], ax = [];
    W.forEach((w, n) => { const sw = G.swaps.includes(n) ? " sw" : ""; ax.push(`<i class="${sw}">${n + 1}</i>`); const k = T.indexOf(w); if (k >= 0) c[k]++;
      [0, 1].forEach(x => cells[x].push(`<i class="${x === k ? "on" : ""}${sw}">${x === k ? c[x] : ""}</i>`)); });
    body = `<div class="gi2"><div class="gi2-t"><div class="gi2-h">${head}${meta}</div>${score}<div class="gi2-mv">${duo.map(chip).join("")}</div></div>
      <div class="gi2-s" style="--n:${W.length}"><div class="mono">ход игры · счёт после каждого раунда</div><div class="gi2-g"><div class="ax">${ax.join("")}</div><div class="rw" style="--c:${c0}">${cells[0].join("")}</div><div class="rw" style="--c:${c1}">${cells[1].join("")}</div></div></div></div>
      <div class="rlog"><a class="lnk mono" href="#${G.key}">разбор игры →</a></div>`;
  } else // «Дуэль»: как на главной, только крупно — два портрета лучших по краям, счёт и цифры игры между ними
    body = `<div class="gh">${card(duo[0])}<div class="gh-m">${tag}<h3>${dG.day} ${dG.monFull}</h3>${score}<div class="mono gb-meta">${vsHtml(G)}${G.rounds ? ` · <b>${G.rounds}</b> ${pw(G.rounds, ["раунд", "раунда", "раундов"])}` : ""}</div><div class="gh-k">${kv}</div></div>${card(duo[1])}</div>${rounds}`;
  return panel(`gbig gv-${v} A`, bg + body, "div", `data-go="#${G.key}"`);
}
let gbCur = null, gbCtx = null; // какая игра сейчас в большой карточке (клик по ленте подставляет её туда)
function gamesBlock(S, cards) {
  cards.forEach((c, i) => c.last = i === 0);
  const G = cards.find(c => c.key === gbCur) || cards[0]; gbCtx = { S, cards };
  return `<div class="gblk">${gameBig(S, G)}
  <div class="gstripw A"><button class="garr l" data-dir="-1" aria-label="Назад">‹</button><div class="gstrip gm-${GM}" id="gstrip">${miniStrip(cards, G.key)}</div><button class="garr r" data-dir="1" aria-label="Вперёд">›</button></div></div>`;
}
function gblkInit(S) {
  const el = document.getElementById("gstrip"); stripInit(el); if (!el) return;
  const cur = el.querySelector(".gmini.cur"); if (cur && gbCur) el.scrollLeft = Math.max(0, cur.offsetLeft - el.clientWidth / 2 + cur.offsetWidth / 2);
  el.addEventListener("click", e => {
    const a = e.target.closest(".gmini"); if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return; e.preventDefault();
    const G = gbCtx.cards.find(c => c.key === a.dataset.key), big = el.closest(".gblk").querySelector(".gbig"); if (!G || !big || gbCur === G.key || (!gbCur && G.last)) return;
    gbCur = G.key; el.querySelectorAll(".gmini").forEach(x => x.classList.toggle("cur", x === a));
    const t = document.createElement("div"); t.innerHTML = gameBig(gbCtx.S, G); const n = t.firstElementChild; n.classList.add("swap"); big.replaceWith(n);
  });
}
// ---------- главная: карточка последней игры («Дуэль») ----------
function lastGame(S, L, gS) {
  const dL = dDay(L.date), key = n => (S.rows.find(r => r.name === n) || {}).key || L.key, pw = (n, w) => plural(n, w).split(" ")[1];
  const rt = (n, t) => ru(L.m.mvpT(L.m.P.find(p => p.name === n), t));
  const hd = `<div class="hd"><h3>${dL.day} ${dL.monFull}</h3><span class="mono">${esc(L.loc)} · ${vsHtml(L)}${L.rounds ? ` · <b>${L.rounds}</b> ${pw(L.rounds, ["раунд", "раунда", "раундов"])}` : ""}</span></div>`;
  const rounds = `<div class="rlog fill A"><span class="mono">раунды</span>${roundsStrip(L)}<a class="lnk mono" href="#${L.key}">разбор игры →</a></div>`;
  const kv = [[ru(gS.hits), "попаданий", "hit"], [pct(gS.acc), "точность", "acc"], [ru(gS.deaths), "смертей", "death"], [ru(gS.shots), "выстрелов", "shot"]].map(([v, l, i]) => `<div><b>${v}</b><span>${ic(i)}${l}</span></div>`).join("");
  const nums = L.teams.map(t => `<div class="lgn num" style="--c:${tc(t.t)}">${sn(t.score)}</div>`), colon = `<i class="lgx"><b></b><b></b></i>`;
  const duo = mvpDuo(L);
  const tm = (d, cls = "") => `<a class="lgmv ${cls}${d.game ? " g" : ""}" href="#${key(d.name)}" style="--c:${tc(d.t)}"><img src="${portrait(d.name)}" alt=""><span><small>${mvpTitle(d)}</small><b>${esc(d.name)}</b><em class="sts">${st("star", ru(d.rating))}${st("hit", d.dealt)}</em></span></a>`;
  // «Дуэль»: два портрета лучших игроков по краям, между ними счёт и цифры игры
  const card = d => `<a class="le-c${d.game ? " g" : ""}" href="#${key(d.name)}" style="--c:${tc(d.t)}"><img src="${portrait(d.name)}" alt=""><span><small>${mvpTitle(d)}</small><b>${esc(d.name)}</b><em class="sts">${st("star", ru(d.rating))}${st("hit", d.dealt)}</em></span></a>`;
  const body = `<div class="le">${card(duo[0])}<div class="le-m"><div class="le-s">${nums.join(colon)}${teamHits(L)}</div><div class="le-k">${kv}</div></div>${card(duo[1])}</div>`;
  return panel(`lastc lg2 lv-d A`, hd + body + rounds, "div", `data-go="#${L.key}"`);
}
// ---------- главная ----------
function viewHome(S) {
  const H = homeData(S), L = gameCard(H.last), dL = dDay(L.date);
  const nG = H.models.length, regs = S.rows.filter(r => r.games >= 3).length, shotsAll = sum(H.models, m => sum(m.P, p => p.shots));
  const sumx = [[nG, "игр", H.locs.map(l => `${esc(l)} ${H.models.filter(m => m.g.location === l).length}`).join(" · ")], [H.rounds, "раундов", `≈${ru(H.rounds / nG)} за игру`], [S.rows.length, "бойца", `${regs} играли от 3 раз`], [H.hits, "попаданий", `≈${ru(H.hits / nG)} за игру`], [(H.acc * 100).toFixed(1).replace(".", ",") + "%", "точность", `${ru(shotsAll)} выстрелов`], (hg => [sum(hg.P, p => p.dealt), "попаданий рекорд", `самая жаркая игра · ${dDay(hg.g.date).day} ${dDay(hg.g.date).monFull}`])(H.models.reduce((x, y) => sum(y.P, p => p.dealt) > sum(x.P, p => p.dealt) ? y : x))];
  const allP = H.models.flatMap(m => m.P), deathsAll = sum(allP, p => p.deaths), aliveP = allP.filter(p => p.alive != null && p.nR), aliveR = div(sum(aliveP, p => p.alive), sum(aliveP, p => p.nR));
  const sizes = H.models.map(m => m.P.length), cardsAll = H.models.map(gameCard), byRounds = cardsAll.filter(g => g.kind !== "попадания");
  const longest = [...byRounds].sort((x, y) => y.rounds - x.rounds)[0], rout = [...byRounds].sort((x, y) => Math.abs(y.teams[0].score - y.teams[1].score) - Math.abs(x.teams[0].score - x.teams[1].score))[0];
  const accTop = S.rows.filter(r => r.games >= 3 && isFinite(r.acc)).sort((x, y) => y.acc - x.acc)[0], dd = d => { const x = dDay(d); return `${x.day} ${x.monFull}`; };
  { const ga = H.models.map(m => div(sum(m.P, p => p.dealt), sum(m.P, p => p.shots))).filter(isFinite); sumx[4][2] = `по играм от ${pct(Math.min(...ga))} до ${pct(Math.max(...ga))}`; }
  sumx.push([deathsAll, "смертей", `≈${ru(deathsAll / nG)} за игру`], [shotsAll, "выстрелов", `≈${ru(shotsAll / nG)} за игру`], [Math.round(sum(sizes, x => x) / nG), "бойцов в игре", `от ${Math.min(...sizes)} до ${Math.max(...sizes)}`],
    [(aliveR * 100).toFixed(1).replace(".", ",") + "%", "дожили до конца", "раундов на бойца"], [longest ? longest.rounds : "—", "раундов рекорд", longest ? `самая долгая игра · ${dd(longest.date)}` : ""], [rout ? `${rout.teams[0].score}:${rout.teams[1].score}` : "—", "крупнейший разгром", rout ? dd(rout.date) : ""]);
  const maxR = H.top[0] ? H.top[0].rating : 1, gS = { hits: sum(L.m.P, p => p.dealt), shots: sum(L.m.P, p => p.shots), deaths: sum(L.m.P, p => p.deaths) }; gS.acc = div(gS.hits, gS.shots);
  const b1 = `<div class="hero center">
    <div><h1 class="one"><span class="w"><i>Статистика</i></span> <span class="w" style="color:var(--uv2)"><i>сезона</i></span></h1><div class="mono A sdate">${dDay(H.first).day} ${dDay(H.first).monFull} — ${dL.day} ${dL.monFull}</div></div>
  </div>
  ${panel("sumx A", `<div class="hd"><span class="mono"><span class="blink"></span>сводка сезона</span><span class="mono">обновлено <b>${dateShort(L.date)}</b></span></div><div class="cells">${sumx.map(([v, l, s], k) => `<div class="cell A" style="--k:${k}"><div class="num" data-count>${typeof v === "number" ? ru(v) : v}</div><div class="lab">${l}</div><div class="sub">${s}</div></div>`).join("")}</div>`)}
  <div class="home2 h2b">
    ${lastGame(S, L, gS)}
    ${panel("topl top3 A", `<div class="hd"><span class="mono">Топ-3 сезона · от 3 игр</span><a class="lnk mono" href="#s3" style="color:var(--ink)">все игроки →</a></div><div class="tcards">${H.top.slice(0, 3).map((p, k) => `<a class="tcard A m${k + 1}" style="--k:${k}" href="#${p.r.key}"><img src="${portrait(p.name)}" alt=""><span class="no">${k + 1}</span><span class="info"><b>${esc(p.name)}</b><small>${plural(p.games, ["игра", "игры", "игр"])}</small><span class="v num">${ic("star")}${ru(p.rating)}</span></span></a>`).join("")}</div>`)}
  </div>`;
  // блок 2: игры — большая последняя игра + лента всех игр
  const cards = H.models.map(gameCard), G = cards[0], dG = dDay(G.date), gp = [...G.m.P].sort((x, y) => y.mvp - x.mvp).slice(0, 5);
  const gTeam = (t, cls) => `<div class="gbt ${cls}" style="--c:${tc(t.t)}"><div class="t${t.t === G.win ? " w" : ""}">${plural(t.n, ["игрок", "игрока", "игроков"])}</div><a class="gbm" href="#${(S.rows.find(r => r.name === t.mvp) || {}).key || G.key}"><img src="${portrait(t.mvp)}" alt=""><span><small>MVP команды</small><b>${esc(t.mvp)}</b><em>${t.mvpDealt} попаданий</em></span></a></div>`;
  const b2 = `<div class="shead A"><h2>Игры · ${cards.length}</h2><a class="allg" href="#games">все игры <i>→</i></a></div>
  ${gamesBlock(S, cards)}`;
  // блок 3: игроки
  const b3 = `<div class="shead A"><h2>Игроки · ${S.rows.length}</h2><a class="allg" href="#itogi">итоги сезона <i>→</i></a></div>
  <div class="players">${panel("tbl A", `<div class="sc"><table id="ptable" class="sticky1"></table></div>`)}
  <div class="pfoot A"><span class="mono">${ic("star")} 100 = среднее число попаданий в игре · ${ic("hit")} ${ic("recv")} ${ic("death")} в среднем за раунд</span><div class="seg" data-pmin><button data-min="1">все</button><button data-min="3" aria-pressed="true">от 3 игр</button></div></div></div>`;
  // блок 4: пушки
  const guns = [...S.guns].sort((a, b) => b.dealt / b.games - a.dealt / a.games);
  const topGun = (f, filt = () => true) => { const l = S.guns.filter(g => filt(g) && isFinite(f(g))); return l.length ? l.reduce((a, b) => f(b) > f(a) ? b : a) : null; };
  const many = g => g.games >= 2, ga = topGun(g => g.dealt / g.games, many), gb = topGun(g => g.ratio, many), gc = topGun(g => g.acc, many), gd = topGun(g => g.players.length);
  const rec = (k, g, v) => g ? panel("rec A", `<div class="k">${k}</div><div class="n">${esc(g.name)}</div><div class="v">${v}</div>`, "a", `href="#${g.key}"`) : "";
  const b4 = `<div class="shead A"><h2>Пушки · ${S.guns.length}</h2><span class="r mono">среднее за игру · тагер узнаётся по адресу, переименования не ломают статистику</span></div>
  <div class="gtop4"><div class="feat">${guns.filter(many).slice(0, 3).map((g, k) => panel("guncard A", `<div class="art">${gunArt(g) ? `<img src="${gunArt(g)}" alt="" loading="lazy">` : ""}<span class="no mono">${String(k + 1).padStart(2, "0")}</span></div><div class="n"><span>${esc(g.name)}</span><small>${genLabel(g)}</small></div><div class="m"><div><b>${one(g.dealt / g.games)}</b><span>попал</span></div><div><b>${r2(g.ratio)}</b><span>попал/получил</span></div><div><b>${pct(g.acc)}</b><span>точность</span></div></div><div class="mono">${g.games} ${plural(g.games, ["игра", "игры", "игр"]).split(" ")[1]} · ${g.players.length} ${plural(g.players.length, ["игрок", "игрока", "игроков"]).split(" ")[1]}</div>`, "a", `href="#${g.key}" style="--k:${k}"`)).join("")}</div>
  <div class="recs4">${rec("Главный калибр", ga, `<b>${one(ga.dealt / ga.games)}</b> попаданий за игру`)}${rec("Убойная", gb, `попал / получил <b>${r2(gb.ratio)}</b>`)}${rec("Снайперская", gc, `точность <b>${pct(gc.acc)}</b>`)}${rec("Переходящее знамя", gd, `<b>${gd.players.length}</b> разных игроков`)}</div></div>
  ${panel("tbl guntbl A", `<div class="hd"><span class="mono">все пушки · среднее за игру</span><span class="mono">клик по заголовку сортирует, по названию открывает пушку</span></div><div class="sc" style="--h:224px"><table id="gtable" class="sticky1"></table></div>`)}
  <footer><span>Статистика по журналам тагеров LaserWar · <a class="lnk" href="https://github.com/${REPO}">исходники и файлы игр</a></span><span>${plural(S.models.length, ["игра", "игры", "игр"])} в базе · рекорды пушек среди сыгравших от 2 игр</span></footer>`;
  return `<section class="slide" id="s1"><div class="wrap">${b1}</div><div class="more">листай</div></section>
  <section class="slide" id="s2"><div class="wrap">${b2}</div></section>
  <section class="slide" id="s3"><div class="wrap">${b3}</div></section>
  <section class="slide" id="s4"><div class="wrap">${b4}</div></section>`;
}
let pmin = 3, pmode = "round", psort = "rating";
function homeInit(S) {
  // сколько раз игрок был лучшим в своей команде (MVP игры тоже считается: он лучший и в команде)
  const tmvp = {}; S.models.forEach(m => mvpDuo(gameCard(m)).forEach(d => tmvp[d.name] = (tmvp[d.name] || 0) + 1));
  // режим таблицы: счётные показатели в среднем за игру или за раунд
  const draw = () => { const R = pmode === "round", per = r => R ? r.gr : r.games, f1 = R ? pr1 : one;
    const cols = [["name", "Игрок", r => r.name, null], ["games", "Игр", r => r.games, String], ["rating", ic("star") + "Рейтинг", r => r.mvp / r.games, ru, 1], ["dealt", ic("hit") + "Попал", r => div(r.dealt, per(r)), f1, 1], ["recv", ic("recv") + "Получил", r => div(r.recv, per(r)), f1], ["ratio", "Попал /<br>получил", r => r.ratio, r2, 1], ["perdeath", "Попал /<br>умер", r => div(r.dealt, r.deaths), one, 1], ["acc", ic("acc") + "Точность", r => r.acc, pct, 1], ["deaths", ic("death") + "Смерти", r => div(r.deaths, per(r)), f1], ["mvps", "MVP<br>игры", r => r.mvps, String], ["tmvps", "MVP<br>команды", r => tmvp[r.name] || 0, String]];
    const rows = S.rows.filter(r => r.games >= pmin); const max = Object.fromEntries(cols.slice(1).map(c => [c[0], Math.max(...rows.map(c[2]).filter(isFinite))]));
    sortable("ptable", cols, rows, (r, key) => `<tr class="${r.games < 3 ? "dim" : ""}"><td class="l"><a class="pl" href="#${r.key}">${esc(r.name)}</a></td>${cols.slice(1).map(c => `<td class="num">${c[0] === key && c[0] !== "games" && isFinite(c[2](r)) ? `<span class="bar" style="--w:${Math.round(c[2](r) / max[c[0]] * 48)}px"></span>` : ""}${isFinite(c[2](r)) || typeof c[2](r) === "string" ? c[3](c[2](r)) : "—"}</td>`).join("")}</tr>`, psort); };
  document.querySelectorAll("[data-pmode] button").forEach(b => b.onclick = () => { pmode = b.dataset.mode; const th = document.querySelector("#ptable th[aria-sort] button"); if (th) psort = th.dataset.k; document.querySelectorAll("[data-pmode] button").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  document.querySelectorAll("[data-pmin] button").forEach(b => b.onclick = () => { pmin = +b.dataset.min; { const th = document.querySelector("#ptable th[aria-sort] button"); if (th) psort = th.dataset.k; } document.querySelectorAll("[data-pmin] button").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  draw();
  const gcols = [["name", "Пушка", g => g.name, null], ["games", "Игр", g => g.games, String], ["players", "Игроков", g => g.players.length, String], ["dealtPG", "Попал", g => g.dealt / g.games, one], ["recvPG", "Получил", g => g.recv / g.games, one], ["ratio", "Попал / получил", g => g.ratio, r2], ["acc", "Точность", g => g.acc, pct], ["deathsPG", "Смерти", g => g.deaths / g.games, one], ["shotsPG", "Выстрелы", g => g.shots / g.games, fmt]];
  const gmax = Object.fromEntries(gcols.slice(1).map(([k, , f]) => [k, Math.max(1e-9, ...S.guns.map(f).filter(isFinite))]));
  sortable("gtable", gcols, S.guns, (g, key) => `<tr><td class="l"><a class="pl gn" href="#${g.key}">${gunArt(g) ? `<img src="${gunArt(g)}" alt="" loading="lazy">` : "<i></i>"}${esc(g.name)}<small>${genLabel(g)}</small></a></td>${gcols.slice(1).map(([k, , f, show]) => `<td class="num">${k === key && isFinite(f(g)) && k !== "games" && k !== "players" ? `<span class="bar" style="--w:${Math.round(f(g) / gmax[k] * 56)}px"></span>` : ""}${isFinite(f(g)) ? show(f(g)) : "—"}</td>`).join("")}</tr>`, "dealtPG");
  gblkInit(S);
  // блоки: появление, подсветка меню и точек
  const main = document.getElementById("main"), navs = [...document.querySelectorAll("#tabs a, #dots a, .logo")];
  const io = new IntersectionObserver(es => es.forEach(e => { const on = e.intersectionRatio >= .4 || (e.isIntersecting && e.intersectionRect.height >= main.clientHeight * .6);
    if (on) { const was = e.target.classList.contains("in"); e.target.classList.add("in"); navs.forEach(d => d.classList.toggle("on", d.getAttribute("href") === "#" + e.target.id)); if (!was) countUp(e.target, true); }
    else if (e.intersectionRatio < .15) e.target.classList.remove("in"); }), { root: main, threshold: [0, .15, .4, .6] });
  document.querySelectorAll(".slide").forEach(sl => io.observe(sl));
}

// ПК: один жест колеса или тачпада = один блок; на телефоне скролл свободный (см. style.css)
(() => {
  const main = document.getElementById("main"), wide = matchMedia("(min-width:981px)");
  let locked = false, lockAt = 0, quiet = 0, tgt = -1, animEnd = 0;
  const scrollable = (t, dy) => { for (let n = t; n && n !== main; n = n.parentElement) { if (n.nodeType !== 1) continue; const oy = getComputedStyle(n).overflowY;
      if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) { if (dy > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 1 : n.scrollTop > 1) return true; } } return false; };
  main.addEventListener("wheel", e => {
    if (!wide.matches || !main.classList.contains("snap") || e.ctrlKey || e.defaultPrevented) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // боковая прокрутка — ленте игр
    if (scrollable(e.target, e.deltaY)) return; // таблица со своим скроллом крутится сама
    const slides = [...main.querySelectorAll(".slide")]; if (!slides.length) return;
    const top = main.scrollTop, H = main.clientHeight;
    let i = 0; slides.forEach((sl, k) => { if (sl.offsetTop <= top + H * .5) i = k; }); if (performance.now() < animEnd && tgt >= 0) i = tgt;
    const cur = slides[i], dir = Math.sign(e.deltaY);
    // блок выше экрана: сначала докручиваем его до края
    if (cur.offsetHeight > H + 8 && (dir > 0 ? top + H < cur.offsetTop + cur.offsetHeight - 4 : top > cur.offsetTop + 4)) return;
    e.preventDefault();
    const now = performance.now();
    // пока идут события (инерция тачпада) — блок не меняем; разблокируем после паузы 200 мс, но не раньше 650 мс
    if (locked) { clearTimeout(quiet); quiet = setTimeout(() => { locked = false; }, Math.max(200, lockAt + 650 - now)); return; }
    if (Math.abs(e.deltaY) < 3) return;
    const nx = slides[i + dir]; if (!nx) return;
    locked = true; lockAt = now; clearTimeout(quiet); quiet = setTimeout(() => { locked = false; }, 650);
    tgt = i + dir; animEnd = now + 700; main.scrollTo({ top: nx.offsetTop, behavior: "smooth" });
  }, { passive: false });
})();
function stripInit(el) {
  if (!el) return; const wrap = el.parentElement;
  const upd = () => { wrap.classList.toggle("at-start", el.scrollLeft < 4); wrap.classList.toggle("at-end", el.scrollLeft + el.clientWidth > el.scrollWidth - 4); };
  wrap.querySelectorAll(".garr").forEach(b => b.onclick = () => el.scrollBy({ left: +b.dataset.dir * el.clientWidth * .8, behavior: "smooth" }));
  el.addEventListener("scroll", upd, { passive: true }); upd();
  // перетаскивание мышью
  let sx = 0, sl = 0, drag = false, moved = false;
  el.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; drag = true; moved = false; sx = e.clientX; sl = el.scrollLeft; });
  addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; el.classList.add("drag"); } el.scrollLeft = sl - dx; });
  addEventListener("pointerup", () => { drag = false; setTimeout(() => el.classList.remove("drag"), 0); });
  el.addEventListener("click", e => { if (moved) { e.preventDefault(); moved = false; } }, true);
}

// ---------- экран «Дуэли»: кто в кого сколько попал + рейтинг по дуэлям ----------
// Рейтинг по дуэлям: каждому подбирается сила так, чтобы она лучше всего объясняла все личные перестрелки сразу
// (модель Брэдли–Терри по попаданиям, 3 условных обмена со средним игроком как страховка, 100 = средний игрок).
const DU = { loc: "", min: 3 };
function duelData(S, loc) {
  const ms = S.models.filter(m => !loc || m.g.location === loc), N = [], ix = {}, games = [];
  ms.forEach(m => m.P.forEach(p => { if (!(p.name in ix)) { ix[p.name] = N.length; N.push(p.name); games.push(0); } games[ix[p.name]]++; }));
  const n = N.length, G = N.map(() => N.map(() => 0)), MT = N.map(() => N.map(() => 0));
  ms.forEach(m => m.P.forEach(a => m.P.forEach(c => { if (a === c) return; const v = m.val(a, c); G[ix[a.name]][ix[c.name]] += v; if (v + m.val(c, a) > 0) MT[ix[a.name]][ix[c.name]]++; })));
  let s = N.map(() => 1); const prior = 3;
  for (let it = 0; it < 300; it++) { const ns = s.map((_, i) => { let w = prior, d = 2 * prior / (s[i] + 1); for (let j = 0; j < n; j++) { if (i === j) continue; const t = G[i][j] + G[j][i]; if (!t) continue; w += G[i][j]; d += t / (s[i] + s[j]); } return w / d; });
    const gm = Math.exp(sum(ns, x => Math.log(x)) / n); s = ns.map(x => x / gm); }
  return { N, games, G, MT, bt: s.map(x => Math.round(100 * x)), max: Math.max(1, ...games), nG: ms.length };
}
function viewDuels(S) {
  const locs = [...new Set(S.models.map(m => m.g.location).filter(Boolean))];
  return `<div class="page dupage">
  <div class="aghead"><div><div class="mono">личные перестрелки за все игры</div><h1>Дуэли</h1></div>
    <div class="agf du-f"><div class="seg" data-dloc><button data-loc="">все игры</button>${locs.map(l => `<button data-loc="${esc(l)}">${esc(l)} · ${S.models.filter(m => m.g.location === l).length}</button>`).join("")}</div>
      <label class="du-r"><span class="mono">сыграл от <b id="duN"></b></span><input type="range" id="duMin" min="1" step="1"></label></div></div>
  ${panel("tbl", `<div class="sc" style="--h:none"><table class="mx dmx sticky1" id="duT"></table></div>
    <div class="ft">В клетке: попал : получил, под счётом коэффициент (попал, делённое на получил) и сколько игр встречались. Чем ярче фон, тем больше встреч и тем надёжнее счёт. ${ic("star")} по дуэлям: сила, которая лучше всего объясняет все личные перестрелки сразу. Перестрелять сильного стоит дороже, чем слабого, 100 это средний игрок. Считается по всем, кто играл, бегунок только прячет строки.</div>`)}
  </div>`;
}
function duelsInit(S) {
  const root = document.querySelector(".dupage"); if (!root) return; const T = root.querySelector("#duT"), R = root.querySelector("#duMin"), key = n => (S.rows.find(r => r.name === n) || {}).key;
  const draw = () => { const D = duelData(S, DU.loc); DU.min = Math.min(DU.min, D.max); R.max = D.max; R.value = DU.min; R.style.setProperty("--p", D.max > 1 ? (DU.min - 1) / (D.max - 1) * 100 + "%" : "100%");
    root.querySelector("#duN").textContent = plural(DU.min, ["игры", "игр", "игр"]);
    root.querySelectorAll("[data-dloc] button").forEach(b => b.setAttribute("aria-pressed", b.dataset.loc === DU.loc));
    const I = D.N.map((_, i) => i).filter(i => D.games[i] >= DU.min).sort((a, b) => D.bt[b] - D.bt[a] || D.games[b] - D.games[a]);
    T.innerHTML = `<thead><tr><th class="l">игрок \\ соперник</th><th class="rt">${ic("star")} по дуэлям</th>${I.map(j => `<th>${esc(D.N[j])}</th>`).join("")}</tr></thead>
    <tbody>${I.map(i => `<tr><td class="l"><a class="pl" href="#${key(D.N[i])}">${esc(D.N[i])}</a><small>${plural(D.games[i], ["игра", "игры", "игр"])}</small></td><td class="rt num">${D.bt[i]}</td>${I.map(j => { if (i === j) return `<td class="tot">—</td>`; const m = D.MT[i][j]; if (!m) return `<td class="tot" title="не встречались">·</td>`; const g = D.G[i][j], t = D.G[j][i];
      return `<td class="cell num" style="--a:${Math.min(46, 7 * m)}%"><b>${g} : ${t}</b><em class="${g > t ? "up" : g < t ? "dn" : ""}">${t ? r2(g / t) : "∞"}</em><small>${plural(m, ["игра", "игры", "игр"])}</small></td>`; }).join("")}</tr>`).join("")}</tbody>`; };
  R.oninput = () => { DU.min = +R.value; draw(); };
  root.querySelectorAll("[data-dloc] button").forEach(b => b.onclick = () => { DU.loc = b.dataset.loc; draw(); });
  draw();
}
// ---------- экран «Все игры» ----------
function viewGames(S) {
  const cards = [...S.models].sort((x, y) => (y.g.date || "").localeCompare(x.g.date || "")).map(gameCard), locs = [...new Set(cards.map(g => g.loc).filter(Boolean))];
  const months = [...new Set(cards.map(g => monthKey(g.date)))];
  return `<div class="page allgames">
  <div class="aghead A"><div><div class="mono">архив · ${dDay(cards[cards.length - 1].date).day} ${dDay(cards[cards.length - 1].date).monFull} — ${dDay(cards[0].date).day} ${dDay(cards[0].date).monFull}</div><h1>Все игры <span>· ${cards.length}</span></h1></div>
    <div class="agf"><span class="mono">площадка</span><div class="seg" data-gloc><button data-loc="" aria-pressed="true">все</button>${locs.map(l => `<button data-loc="${esc(l)}">${esc(l)} · ${cards.filter(g => g.loc === l).length}</button>`).join("")}</div></div></div>
  ${months.map(mk => { const list = cards.filter(g => monthKey(g.date) === mk); return `<section class="agm" data-month="${mk}"><h2 class="A"><span>${monthName(list[0].date)}</span><i class="mono">${plural(list.length, ["игра", "игры", "игр"])}</i></h2><div class="gcards all">${list.map((g, k) => gameTile(g, k)).join("")}</div></section>`; }).join("")}
  </div>`;
}
function gamesInit() {
  const root = document.querySelector(".allgames"); if (!root) return;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("in")));
  root.querySelectorAll("[data-gloc] button").forEach(b => b.onclick = () => {
    root.querySelectorAll("[data-gloc] button").forEach(x => x.setAttribute("aria-pressed", x === b));
    root.querySelectorAll(".gcard").forEach(c => c.hidden = !!b.dataset.loc && c.dataset.loc !== b.dataset.loc);
    root.querySelectorAll(".agm").forEach(s => s.hidden = !s.querySelector(".gcard:not([hidden])")); });
}

// ---------- экран «Итоги сезона»: номинации, рекорды одной игры, ачивки, противостояния ----------
const pr1 = x => x.toFixed(2).replace(".", ",");
// полученные на пистолете умножаем на 4/5, смерти — на 5/4 (как если бы у него было 4 жизни, как у автомата)
const PIST_R = 0.8, PIST_D = 1.25;
const AGG = items => { const a = { games: items.length, dealt: 0, recv: 0, deaths: 0, shots: 0, gr: 0, alive: 0, rounds: 0, accs: [], ratios: [] };
  for (const p of items) { const pi = clsOf(p) === "pistol", rv = p.recv * (pi ? PIST_R : 1);
    a.dealt += p.dealt; a.recv += rv; a.deaths += pi ? Math.min(p.deaths * PIST_D, p.gr || Infinity) : p.deaths; a.shots += p.shots; a.gr += p.gr;
    if (p.alive != null && p.nR) { a.alive += p.alive; a.rounds += p.nR; } if (p.shots) a.accs.push(p.acc); const ra = div(p.dealt, rv); if (isFinite(ra)) a.ratios.push(ra); }
  a.acc = a.accs.length ? sum(a.accs, x => x) / a.accs.length : NaN; a.ratio = a.ratios.length ? sum(a.ratios, x => x) / a.ratios.length : NaN; return a; };
const unitsOf = p => p.parts ? gunUnits(p).map(u => ({ ...u, alive: null, nR: 0 })) : [p];
const perR = (a, k) => a && a.gr ? a[k] / a.gr : NaN;
// [название, подпись, значение, направление, формат, только автоматы, антипремия]
const SNOMS = [
  ["Терминатор", "больше всех попаданий за раунд", a => perR(a, "dealt"), 1, pr1, false],
  ["Джон Уик", "лучшее «попал / получил»", a => a.ratio, 1, r2, false],
  ["Белке в глаз", "лучшая точность", a => a.acc, 1, pct, true],
  ["Невидимка", "меньше всех получил за раунд", a => perR(a, "recv"), -1, pr1, false],
  ["Горец", "реже всех погибал · доля раундов", a => perR(a, "deaths"), -1, pct, false],
  ["Берсерк", "больше всех попаданий на одну смерть", a => a.deaths ? a.dealt / a.deaths : NaN, 1, one, false],
  ["Последний герой", "чаще всех доживал до конца раунда", a => a.rounds ? a.alive / a.rounds : NaN, 1, pct, true],
  ["Бережливый", "меньше всех выстрелов за раунд", a => perR(a, "shots"), -1, one, true],
  ["Спонсор патронного завода", "больше всех выстрелов за раунд", a => perR(a, "shots"), 1, one, true, true],
  ["Штурмовик Империи", "худшая точность", a => a.acc, -1, pct, true, true],
  ["Живой щит", "больше всех получил за раунд", a => perR(a, "recv"), 1, pr1, false, true],
  ["Кенни", "чаще всех погибал · доля раундов", a => perR(a, "deaths"), 1, pct, false, true],
];
const NOM_MIN = 3;
function seasonNomRows(S) {
  const by = {}; S.models.forEach(m => m.P.forEach(p => (by[p.name] = by[p.name] || []).push(p)));
  return Object.entries(by).map(([name, l]) => { const u = l.flatMap(unitsOf), au = u.filter(x => clsOf(x) === "auto");
    const T = AGG(u), A = au.length ? AGG(au) : null; T.games = l.length; if (A) A.games = l.filter(p => unitsOf(p).some(x => clsOf(x) === "auto")).length;
    return { name, T, A }; });
}
function viewItogi(S) {
  const H = homeData(S), cards = H.models.map(gameCard), key = n => (S.rows.find(r => r.name === n) || {}).key, dd = d => { const x = dDay(d); return `${x.day} ${x.monFull}`; };
  // номинации сезона: призёр и ещё двое следом
  const rows = seasonNomRows(S);
  const noms = SNOMS.map(([t, l, f, dir, show, auto, anti]) => { const list = rows.map(r => ({ name: r.name, a: auto ? r.A : r.T })).filter(x => x.a && x.a.games >= NOM_MIN).map(x => ({ name: x.name, v: f(x.a) })).filter(x => isFinite(x.v)).sort((x, y) => dir * (y.v - x.v));
    return { t, l, show, anti, list }; }).filter(n => n.list.length);
  const mv = S.rows.filter(r => r.mvps > 0).map(r => ({ name: r.name, v: r.mvps })).sort((x, y) => y.v - x.v);
  if (mv.length) noms.splice(1, 0, { t: "Коллекционер MVP", l: "чаще всех становился MVP игры", show: v => plural(v, ["раз", "раза", "раз"]), list: mv });
  const nomCard = (n, k) => { const [w, ...rest] = n.list; return panel(`nmc A${n.anti ? " anti" : ""}`, `<div class="k mono">${esc(n.t)}</div><a class="w" href="#${key(w.name)}"><img src="${portrait(w.name)}" alt=""><span><b>${esc(w.name)}</b><small>${n.l}</small></span><em class="num">${n.show(w.v)}</em></a>
    <div class="nx">${rest.slice(0, 2).map((x, i) => `<a href="#${key(x.name)}"><i class="mono">${i + 2}</i><span>${esc(x.name)}</span><em class="num">${n.show(x.v)}</em></a>`).join("")}</div>`, "div", `style="--k:${k}"`); };
  const good = noms.filter(n => !n.anti), anti = noms.filter(n => n.anti);
  // кто собрал больше всего титулов
  const titles = {}; noms.forEach(n => (titles[n.list[0].name] = titles[n.list[0].name] || []).push(n.t));
  const champs = Object.entries(titles).sort((a, b) => b[1].length - a[1].length);
  // рекорды одной игры: только сыгравшие игру целиком; выстрелы, точность и «дожил до конца» — только автоматы
  const all = cards.flatMap(g => g.m.P.filter(p => !g.m.winners.length || p.gr >= g.m.winners.length).map(p => ({ p, g })));
  const autoOnly = /Спонсор|Бережливый|Белке|Штурмовик|Последний/;
  const recs = [["Пик формы", "Самый высокий ★ за игру", p => p.mvp, 1, ru], ...REC_NOMS.filter(n => n[0] !== "MVP").map(n => n[0] === "Джон Уик" ? [n[0], "Лучшее «попал / получил»", ...n.slice(2)] : n[0] === "Последний герой" ? [...n.slice(0, 5), p => p.alive != null && p.nR] : n)].map(([t, l, f, dir, show, ok]) => { const k = NOM_KEY[t] || "mvp";
    const list = all.filter(({ p }) => (ok ? ok(p) : true) && isFinite(f(p)) && !unknownOf(p)[k] && !(autoOnly.test(t) && (p.parts || clsOf(p) !== "auto"))); if (!list.length) return "";
    const b = list.reduce((x, y) => dir * (f(y.p) - f(x.p)) > 0 ? y : x);
    return panel("rcc A", `<div class="k mono">${esc(t)}</div><div class="v num">${show(f(b.p))}</div><div class="n">${esc(b.p.name)}</div><div class="l">${l.toLowerCase().replace("★", ic("star"))} · ${dd(b.g.date)}</div>`, "a", `href="#${b.g.key}"`); }).join("");
  // ачивки из разборов игр
  const aw = cards.flatMap(g => (g.awards || []).filter(a => a && a[0]).map(([t, names, stat, txt]) => ({ t, names: String(names || "").split(",").map(s => s.trim()).filter(Boolean), stat, txt, g })));
  const cnt = {}; aw.forEach(a => a.names.forEach(n => cnt[n] = (cnt[n] || 0) + 1));
  const coll = Object.entries(cnt).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")), cmax = coll.length ? coll[0][1] : 1;
  const achHtml = `<div class="ach"><div class="ach-l">${panel("achp", `<div class="hd mono">коллекция · ${aw.length} ${pw(aw.length, ["ачивка", "ачивки", "ачивок"])}</div><button class="ach-p on" data-p=""><span>Все игроки</span><em class="num">${aw.length}</em></button>${coll.map(([n, c]) => `<button class="ach-p" data-p="${esc(n)}"><span>${esc(n)}</span><i style="--w:${Math.round(c / cmax * 100)}%"></i><em class="num">${c}</em></button>`).join("")}`)}</div>
    <div class="ach-f">${aw.map(a => panel("award", `<img src="${portrait(a.names[0])}" alt=""><div><div class="k">${esc(a.t)}</div><div class="n">${a.names.map(s => pLink(s, S)).join(", ")}</div><div class="s">${esc(a.stat)}</div></div><div class="x">${esc(a.txt)}</div><a class="gd mono" href="#${a.g.key}">игра ${dd(a.g.date)} →</a>`, "div", `data-names="${esc("|" + a.names.join("|") + "|")}"`)).join("")}</div></div>`;
  // противостояния: пары, которые больше всех попали друг в друга за сезон
  const pairs = []; for (const r of S.rows) for (const [o, x] of Object.entries(r.pairs)) { const y = r.against[o] || 0; if (r.name < o) pairs.push({ a: r.name, b: o, ab: x, ba: y, total: x + y, meet: (r.meet || {})[o] || 0 }); }
  pairs.sort((x, y) => y.total - x.total);
  const duel = (D, k) => panel(`duel A${k ? "" : " main"}`, `<div class="mono">${k ? `№ ${k + 1}` : "главная дуэль"} · ${plural(D.meet, ["встреча", "встречи", "встреч"])}</div><div class="pp"><div class="p"><img src="${portrait(D.a)}" alt=""><div class="n">${pLink(D.a, S)}</div></div><div class="big num">${D.ab}<i> : </i>${D.ba}</div><div class="p"><img src="${portrait(D.b)}" alt=""><div class="n">${pLink(D.b, S)}</div></div></div><div class="mono">${D.total} попаданий друг в друга</div>`);
  return `<div class="page itogi">
  <div class="aghead A"><div><div class="mono">${dDay(H.first).day} ${dDay(H.first).monFull} — ${dDay(cards[0].date).day} ${dDay(cards[0].date).monFull} · ${plural(cards.length, ["игра", "игры", "игр"])}</div><h1>Итоги <span>сезона</span></h1></div>
    <div class="itc">${champs.slice(0, 3).map(([n, ts]) => `<a class="itc-c" href="#${key(n)}"><img src="${portrait(n)}" alt=""><span><b>${esc(n)}</b><small class="mono">${plural(ts.length, ["титул", "титула", "титулов"])}</small></span></a>`).join("")}</div></div>
  ${ptabs([["noms", `Номинации · ${noms.length}`], ["recs", "Рекорды одной игры"], ["ach", `Ачивки · ${aw.length}`], ["duels", "Противостояния"]])}
  ${pane("noms", `<div class="sect"><div class="sh"><h2>Герои сезона</h2><span class="mono">в среднем за раунд · участвуют сыгравшие от ${NOM_MIN} игр</span></div><div class="nmcs">${good.map(nomCard).join("")}</div>
    <div class="sh"><h2>Антипремии</h2><span class="mono">тоже надо уметь</span></div><div class="nmcs four">${anti.map(nomCard).join("")}</div></div>`)}
  ${pane("recs", `<div class="sect"><div class="sh"><h2>Рекорды одной игры</h2><span class="mono">лучшая игра среди всех · клик открывает игру</span></div><div class="rccs">${recs}</div></div>`)}
  ${pane("ach", `<div class="sect"><div class="sh"><h2>Ачивки</h2><span class="mono">выдаются в разборе каждой игры · клик по игроку оставляет только его</span></div>${achHtml}</div>`)}
  ${pane("duels", `<div class="sect"><div class="sh"><h2>Противостояния</h2><span class="mono">пары, которые больше всех попали друг в друга за все игры</span></div><div class="dls">${pairs.slice(0, 9).map(duel).join("")}</div></div>`)}
  </div>`;
}
function itogiInit() {
  const root = document.querySelector(".itogi"); if (!root) return; tabsInit(root);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("in")));
  root.querySelectorAll(".ach-p").forEach(b => b.onclick = () => { root.querySelectorAll(".ach-p").forEach(x => x.classList.toggle("on", x === b));
    root.querySelectorAll(".ach-f .award").forEach(c => c.hidden = !!b.dataset.p && !c.dataset.names.includes("|" + b.dataset.p + "|")); });
}

// ---------- сортируемая таблица ----------
const cmpNum = (x, y, dir) => isFinite(x) !== isFinite(y) ? (isFinite(x) ? -1 : 1) : isFinite(x) ? dir * (x - y) : 0;
function sortable(id, cols, rows, rowHtml, initial) {
  let key = initial, dir = -1;
  const el = document.getElementById(id); if (!el) return;
  const draw = () => { const c = cols.find(x => x[0] === key);
    const sorted = [...rows].sort((a, b) => key === "name" ? dir * String(c[2](a)).localeCompare(String(c[2](b)), "ru") : cmpNum(c[2](a) ?? -1, c[2](b) ?? -1, dir));
    el.innerHTML = `<thead><tr>${cols.map(([k, label]) => `<th class="${k === "name" ? "l" : ""}" ${k === key ? `aria-sort="${dir < 0 ? "descending" : "ascending"}"` : ""}><button data-k="${k}">${label}</button></th>`).join("")}</tr></thead><tbody>${sorted.map(r => rowHtml(r, key)).join("")}</tbody>`; };
  el.onclick = e => { const kb = e.target.closest && e.target.closest("[data-k]"), k = kb && kb.dataset.k; if (!k) return; if (k === key) dir = -dir; else { key = k; dir = k === "name" ? 1 : -1; } draw(); };
  draw();
}
function statTable(id, cols, rows, nameHtml, initial) {
  const max = Object.fromEntries(cols.slice(1).map(([k, , f]) => [k, Math.max(1e-9, ...rows.map(f).filter(isFinite))]));
  sortable(id, cols, rows, (r, key) => `<tr><td class="l">${nameHtml(r)}</td>${cols.slice(1).map(([k, , f, show]) => `<td class="num">${k === key && isFinite(f(r)) && k !== "games" ? `<span class="bar" style="--w:${Math.round(f(r) / max[k] * 56)}px"></span>` : ""}${show(f(r))}</td>`).join("")}</tr>`, initial);
}
const statCols = (first, avg) => [first, ["games", "Игр", r => r.games, String],
  avg ? ["dealtPG", "Попал за игру", r => r.dealt / r.games, one] : ["dealt", "Попал", r => r.dealt, fmt],
  avg ? ["recvPG", "Получил за игру", r => r.recv / r.games, one] : ["recv", "Получил", r => r.recv, fmt],
  ["ratio", "Попал / получил", r => r.ratio, r2], ["acc", "Точность", r => r.acc, pct],
  avg ? ["shotsPG", "Выстрелы за игру", r => r.shots / r.games, fmt] : ["shots", "Выстрелы", r => r.shots, fmt],
  avg ? ["deathsPG", "Смерти за игру", r => r.deaths / r.games, one] : ["deaths", "Смерти", r => r.deaths, fmt]];

// ---------- вкладки страниц ----------
function tabsInit(root) {
  const tabs = [...root.querySelectorAll(".ptabs a")], panes = [...root.querySelectorAll(".pane")];
  const pick = id => { tabs.forEach(a => a.classList.toggle("on", a.dataset.tab === id)); panes.forEach(p => p.hidden = p.dataset.pane !== id); };
  tabs.forEach(a => a.onclick = e => { e.preventDefault(); pick(a.dataset.tab); });
  pick(tabs[0].dataset.tab);
}
const ptabs = list => `<nav class="ptabs">${list.map(([id, label], i) => `<a href="#" data-tab="${id}" class="${i ? "" : "on"}">${label}</a>`).join("")}</nav>`;
const pane = (id, inner) => `<div class="pane" data-pane="${id}">${inner}</div>`;

// ---------- игра ----------
function viewGame(S, key) {
  const x = allGames().find(z => z.key === key); if (!x) return viewHome(S);
  const m = S.models[x.i], { g, P, teamIds, val, valT, estH } = m, G = gameCard(m);
  const who = p => pLink(p.name, S);
  const rng = ([a, b]) => a === b ? `${a}` : `${a}–${b}`;
  const when = (p, t) => !p.swap ? "" : p.segRounds ? (q => (q.length > 1 || q[0][0] !== q[0][1] ? "раунды " : "раунд ") + q.map(rng).join(", "))(p.segRounds.filter((_, k) => p.segs[k].team === t)) : p.teams[0] === t ? "до смены" : "после смены";
  const inTeam = t => P.filter(p => p.teams.includes(t)).sort((a, b) => a.swap - b.swap);
  const segOf = (p, t) => p.segs.filter(s => s.team === t);
  const swappers = P.filter(p => p.swap);
  const board = teamIds.map(t => {
    const mem = inTeam(t), dealt = sum(P, a => sum(P, v => valT(a, v, t)));
    const recv = sum(mem, p => sum(segOf(p, t), s => s.recv)), shots = sum(mem, p => sum(segOf(p, t), s => s.shots)), deaths = sum(mem, p => sum(segOf(p, t), s => s.deaths));
    const won = m.winners.filter(w => w === t).length, tm = mem.filter(p => m.shareT(p, t) > .5).sort((a, b) => m.mvpT(b, t) - m.mvpT(a, t))[0];
    const eD = P.some(v => !v.teams.includes(t) && v.est.has("recv") && P.some(a => estH(a, v))), eR = mem.some(p => p.e.recv), eK = mem.some(p => p.e.deaths), eS = mem.some(p => p.e.shots);
    return panel("team", `<div class="nm"><b>${plural(mem.length, ["игрок", "игрока", "игроков"])}</b><span class="mono">${m.winners.length ? `раундов <b>${won}</b>` : ""}</span></div>
      <div class="roster">${mem.map(p => `${who(p)}${p.swap ? ` <small>(${when(p, t)})</small>` : ""}`).join(", ")}</div>
      <div class="kv"><div><div class="num">${A(eD)}${fmt(dealt)}</div><div class="lab">попал</div></div><div><div class="num">${A(eR)}${fmt(recv)}</div><div class="lab">получил</div></div><div><div class="num">${A(eD || eR)}${r2(div(dealt, recv))}</div><div class="lab">попал / получил</div></div><div><div class="num">${A(eK)}${deaths}</div><div class="lab">смертей</div></div><div><div class="num">${A(eS)}${fmt(shots)}</div><div class="lab">выстрелов</div></div><div><div class="num">${A(eD || eS)}${pct(div(dealt, shots))}</div><div class="lab">точность</div></div></div>
      ${tm ? `<div class="mvp"><div class="ring" style="--s:56px;--c:${tc(t)}"><img src="${portrait(tm.name)}" alt=""></div><div><div class="k">MVP команды</div><div class="n">${who(tm)}</div><div class="mono">${ic("star")} <b>${A(tm.e.mvp)}${fmt(tm.mvp)}</b> · ${ic("hit")} <b>${tm.dealt}</b></div></div></div>` : ""}`, "div", `style="--c:${tc(t)}"`);
  });
  const swapNote = swappers.length ? `<p class="note">По ходу игры ${(n => n.length > 1 ? n.slice(0, -1).join(", ") + " и " + n[n.length - 1] : n[0])(swappers.map(p => esc(p.name)))} ${swappers.length > 1 ? "сменили" : "сменил(а)"} команду${m.swaps.length ? ` после ${m.swaps.map(r => r + "-го").join(" и ")} раунда` : ""}. Попадания, смерти и выстрелы такого игрока посчитаны за каждую команду отдельно.</p>` : "";
  // номинации и ачивки
  const pairs = P.flatMap(a => P.map(v => ({ a, v, n: estH(a, v) ? 0 : val(a, v) })));
  const tp = pairs.reduce((a, y) => y.n > a.n ? y : a, { n: 0 });
  const nomRows = P.map(p => ({ ...p, rounds: p.nR }));
  const extraNom = tp.n ? [panel("nom", `<span class="nt">Охота открыта</span><span class="lab">Больше всех в одного соперника</span><span class="ws">${who(tp.a)} <span class="muted">→ ${esc(tp.v.name)}</span></span><span class="v">${tp.n}</span>`)] : [];
  const awards = (g.awards || []).filter(a => a && a[0]);
  // дуэли
  const maxPair = Math.max(1, ...P.flatMap(a => P.map(v => val(a, v))));
  const coefS = (a, b) => b ? r2(a / b) : "∞";
  const dhd = `<div class="drow hd"><span></span><span class="half lft"><button data-sk="gave">попал</button></span><span class="half rgt"><button data-sk="took">получил</button></span><span class="bal"><button data-sk="tot">всего</button></span><span class="bal"><button data-sk="ratio" aria-pressed="true">коэф.</button></span></div>`;
  const drowsHtml = (rows, mx) => rows.map(r => `<div class="drow" data-gave="${r.gave}" data-took="${r.took}" data-tot="${r.gave + r.took}" data-ratio="${r.took ? r.gave / r.took : 1e9 + r.gave}"><span class="nm">${esc(r.o.name)}</span><span class="half lft"><span class="num">${A(r.eg)}${r.gave}</span><i style="--c:${r.cp};--w:${(r.gave / mx * 72).toFixed(1)}%"></i></span><span class="half rgt"><i style="--c:${r.co};--w:${(r.took / mx * 72).toFixed(1)}%"></i><span class="num">${A(r.et)}${r.took}</span></span><span class="bal">${r.gave + r.took}</span><span class="bal">${coefS(r.gave, r.took)}</span></div>`).join("");
  const byRatio = rows => rows.sort((a, b) => b.gave / (b.took || .5) - a.gave / (a.took || .5));
  const otherTeam = t => teamIds.find(z => z !== t) ?? t;
  const duels = [...P].sort((a, b) => b.ratio - a.ratio).map(p => {
    let body;
    if (!p.swap) body = dhd + drowsHtml(byRatio(p.foes.map(o => ({ o, gave: val(p, o), took: val(o, p), eg: estH(p, o), et: estH(o, p), cp: tc(p.teams[0]), co: tc(o.teams[0]) }))), maxPair);
    else body = p.teams.map(t => { const u = otherTeam(t);
      const rows = byRatio(P.filter(o => o !== p).map(o => ({ o, gave: valT(p, o, t), took: valT(o, p, u), cp: tc(t), co: tc(u) })).filter(r => r.gave || r.took));
      const gs = sum(rows, r => r.gave), ks = sum(rows, r => r.took);
      return `<div class="dpart"><div class="dpart-h"><span class="dot" style="--c:${tc(t)}"></span><b>${when(p, t)}</b><span class="dpart-s num">${gs} : ${ks} · ${coefS(gs, ks)}</span></div>${dhd}${drowsHtml(rows, maxPair)}</div>`; }).join("");
    return panel("dcard", `<div class="dhead"><div><div class="n">${who(p)}</div><div class="s">попал ${A(p.e.dealt)}${p.dealt} · получил ${A(p.e.recv)}${p.recv}</div></div><div class="ratio num">${A(p.e.ratio)}${r2(p.ratio)}<small>попал / получил</small></div></div><div class="drows" data-sortable>${body}</div>`);
  }).join("");
  // кто в кого
  const maxT = Math.max(1, ...g.hits.map(h => h[3]));
  const grids = teamIds.map(t => {
    const att = inTeam(t).sort((a, b) => sum(P, v => valT(b, v, t)) - sum(P, v => valT(a, v, t)));
    const vic = P.filter(p => p.teams.some(z => z !== t)).sort((a, b) => sum(P, k => valT(k, b, t)) - sum(P, k => valT(k, a, t)));
    return panel("tbl", `<div class="cap"><span class="dot" style="--c:${tc(t)}"></span> стреляет эта команда</div><div class="sc" style="--h:none"><table class="mx sticky1" style="--c:${tc(t)}"><thead><tr><th class="l">↓ кто → в кого</th>${vic.map(v => `<th>${esc(v.name)}</th>`).join("")}<th>Всего</th></tr></thead>
    <tbody>${att.map(a => `<tr><td class="l">${who(a)}${a.swap ? `<small>${when(a, t)}</small>` : ""}</td>${vic.map(v => { if (a === v) return `<td class="tot">—</td>`; const n = valT(a, v, t), s = n / maxT, e = estH(a, v);
      return `<td class="cell${s > .55 ? " hi" : ""}${e ? " est" : ""}" style="--a:${Math.round(6 + s * 84)}%">${A(e)}${n}</td>`; }).join("")}<td class="tot">${sum(vic, v => valT(a, v, t))}</td></tr>`).join("")}</tbody></table></div>`);
  }).join("");
  // фраги
  const fr = [...P].sort((a, b) => (b.fragEx + b.fragEs) - (a.fragEx + a.fragEs)), ftop = Math.max(1, ...fr.map(p => p.fragEx + p.fragEs));
  const frags = `<div class="frags">${fr.map(p => { const tot = p.fragEx + p.fragEs, est = p.fragEs >= .05;
    return `<div class="frow" style="--c:${tc(p.teams[p.teams.length - 1])}">${who(p)}<span class="ftrack"><i class="ex" style="width:${(p.fragEx / ftop * 100).toFixed(1)}%"></i><i class="es" style="width:${(p.fragEs / ftop * 100).toFixed(1)}%"></i></span><span class="ftot">${est ? "~" : ""}${Math.round(tot)}<small>${!est ? "все точные" : p.fragEx ? `${p.fragEx} точно + ~${Math.round(p.fragEs)}` : "оценка"}</small></span></div>`; }).join("")}</div>
  <p class="note">Фраг засчитан тому, кто попал последним перед смертью. Тагеры 7-го поколения не пишут журнал, их смерти поделены между стрелявшими пропорционально попаданиям (светлая часть полоски).</p>`;
  const replay = DATA.replays.includes(g.date) ? `<a class="lnk mono" href="../replay.html#${esc(g.date)}" style="color:var(--ink)">повтор боя <span class="tag">бета</span></a>` : "";
  const d = dDay(g.date);
  return `<div class="page">
  ${panel("phero", `<div class="bgimg" style="--img:url(${placeArt(g.location, g.date)})"></div><div><div class="eyebrow">${esc(g.location || "игра")} · ${d.day} ${d.monFull} ${d.y}${g.title ? " · " + esc(g.title) : ""}</div><h1>${d.day} ${d.monFull}</h1>
    <div class="facts"><div class="fact"><span class="v">${P.length}</span><span class="k">игроков</span></div>${m.winners.length ? `<div class="fact"><span class="v">${m.winners.length}</span><span class="k">раундов</span></div>` : ""}<div class="fact"><span class="v">${fmt(sum(P, p => p.dealt))}</span><span class="k">попаданий</span></div><div class="fact"><span class="v">${fmt(sum(P, p => p.deaths))}</span><span class="k">смертей</span></div><div class="fact"><span class="v">${pct(div(sum(P, p => p.dealt), sum(P, p => p.shots)))}</span><span class="k">точность</span></div></div>
    ${replay ? `<div style="margin-top:14px">${replay}</div>` : ""}</div>
    <div class="fig"><img src="${figure(m.mvp.name)}" alt=""></div>`)}
  <div class="board">${board[0]}<div class="bigscore">${scoreHtml(G, "sc")}<div class="mono">${G.kind === "раунды" ? "счёт по раундам" : "счёт по попаданиям"}</div><div class="mono">попадания <b>${ru(G.teams[0].hits)}</b> : <b>${ru(G.teams[1].hits)}</b></div>${m.mvp ? `<div class="gmvp"><img src="${portrait(m.mvp.name)}" alt=""><div style="text-align:left"><div class="mono" style="color:var(--uv2)">MVP игры</div><div class="n">${who(m.mvp)}</div></div></div>` : ""}</div>${board[1]}</div>
  ${m.winners.length ? panel("rlog", `<span class="mono" style="margin-right:4px">раунды</span>${roundsStrip(G, true)}<span class="note" style="margin:0">раунд проигрывает команда, все игроки которой погибли${g.rounds.exact ? "" : "; часть раундов определена приблизительно"}</span>`, "div", `style="padding:10px 16px;border-top:1px solid var(--line)"`) : ""}
  ${swapNote || (g.notes || []).length ? `<details class="notes"><summary class="mono">примечания к игре · ${(g.notes || []).length + (swapNote ? 1 : 0)}</summary>${swapNote}${(g.notes || []).map(n => `<p class="note">${esc(n)}</p>`).join("")}</details>` : ""}
  ${ptabs([["players", "Игроки"], ["duels", "Дуэли"], ["matrix", "Кто в кого"], ["awards", `Награды${awards.length ? ` · ${awards.length}` : ""}`], ["frags", "Фраги"]])}
  ${pane("players", `<div class="sect"><div class="seg" data-gmode><button data-gmode="tot" aria-pressed="true">Всего</button><button data-gmode="rnd">За раунд</button></div>${panel("tbl", `<div class="sc" style="--h:none"><table id="gameTable" class="sticky1"></table></div><div class="ft">${ic("star")} 100 — среднее число попаданий на игрока в этой игре; 150 — в полтора раза больше среднего. Полоска в колонке сортировки окрашена цветом команды.</div>`)}</div>`)}
  ${pane("duels", `<div class="duels">${duels}</div><p class="note">Слева — сколько раз игрок попал в соперника, справа — сколько раз соперник попал в него. Заголовки в карточке сортируют список.</p>`)}
  ${pane("matrix", `<div class="grids">${grids}</div><p class="note">Строка — кто стрелял, столбец — в кого попал. Курсивом и «≈» — оценка: тагер не считан, попадания по нему поделены между стрелявшими.</p>`)}
  ${pane("awards", `<div class="sect">${awards.length ? `<h2>Ачивки</h2><div class="awards">${awards.map(([t, names, stat, txt]) => { const n = String(names || "").split(",")[0].trim(); return panel("award", `<img src="${portrait(n)}" alt=""><div><div class="k">${esc(t)}</div><div class="n">${String(names || "").split(",").map(s => s.trim()).filter(Boolean).map(s => pLink(s, S)).join(", ")}</div><div class="s">${esc(stat)}</div></div><div class="x">${esc(txt)}</div>`); }).join("")}</div>` : ""}
    <h2>Номинации</h2><div class="noms">${nomTiles(nomRows, who, extraNom).replace(/<div class="nom">/g, '<div class="panel nom"><div class="c"></div><i class="pg"></i>')}</div></div>`)}
  ${pane("frags", frags)}
  </div>`;
}
let gameMode = "tot";
function gameInit(S, key) {
  const x = allGames().find(z => z.key === key); if (!x) return;
  const m = S.models[x.i];
  const draw = () => {
    const R = gameMode === "rnd", pr = (p, v) => R ? div(v, p.gr) : v, nf = (v, f) => R ? r2(v) : f(v), max = Math.max(1e-9, ...m.P.map(p => pr(p, p.dealt)));
    document.querySelectorAll("[data-gmode] button").forEach(b => b.setAttribute("aria-pressed", b.dataset.gmode === gameMode));
    const cols = [["name", "Игрок", p => p.name], ["dealt", "Попал", p => pr(p, p.dealt)], ["recv", "Получил", p => pr(p, p.recv)], ["ratio", "Попал / получил", p => p.ratio], ["deaths", "Смерти", p => pr(p, p.deaths)], ["dpd", "Попал на смерть", p => div(p.dealt, p.deaths)], ["shots", "Выстрелы", p => pr(p, p.shots)], ["acc", "Точность", p => p.acc]];
    const pd = v => isFinite(v) ? one(v) : "∞";
    if (m.winners.length) cols.push(["alive", "Раундов без смерти", p => p.alive]);
    cols.push(["mvp", ic("star") + "Рейтинг", p => p.mvp]);
    const bmax = Object.fromEntries(cols.slice(1).map(([k, , f]) => [k, Math.max(1e-9, ...m.P.map(f).filter(isFinite))]));
    const bar = (p, k, key) => { if (k !== key) return "";
      if (k === "dealt") return p.teams.map(t => { const n = sum(m.P, v => m.valT(p, v, t)); return `<span class="bar" style="--c:${tc(t)};--w:${Math.round(pr(p, n) / max * 80)}px;margin-right:${p.swap ? 1 : 8}px"></span>`; }).join("");
      const v = cols.find(c => c[0] === k)[2](p); return isFinite(v) ? `<span class="bar" style="--c:${tc(p.teams[p.teams.length - 1])};--w:${Math.round(v / bmax[k] * 80)}px;margin-right:8px"></span>` : ""; };
    sortable("gameTable", cols, m.P, (p, key) => `<tr><td class="l">${pLink(p.name, S)}<small>${esc(p.gun !== p.name ? p.gun : "")}${p.swap ? " · смена команды" : ""}</small></td>
      <td class="num">${bar(p, "dealt", key)}${A(p.e.dealt)}${nf(pr(p, p.dealt), fmt)}</td>
      <td class="num">${bar(p, "recv", key)}${A(p.e.recv)}${nf(pr(p, p.recv), fmt)}</td><td class="num">${bar(p, "ratio", key)}${A(p.e.ratio)}${r2(p.ratio)}</td><td class="num">${bar(p, "deaths", key)}${A(p.e.deaths)}${nf(pr(p, p.deaths), fmt)}</td><td class="num">${bar(p, "dpd", key)}${pd(div(p.dealt, p.deaths))}</td><td class="num">${bar(p, "shots", key)}${A(p.e.shots)}${R ? one(pr(p, p.shots)) : fmt(p.shots)}</td><td class="num">${bar(p, "acc", key)}${A(p.e.acc)}${pct(p.acc)}</td>${m.winners.length ? `<td class="num">${bar(p, "alive", key)}${p.alive ?? "—"}${p.nR ? ` <span class="muted">/ ${p.nR}</span>` : ""}</td>` : ""}<td class="num">${bar(p, "mvp", key)}<b>${A(p.e.mvp)}${fmt(p.mvp)}</b></td></tr>`, "mvp");
  };
  document.querySelectorAll("[data-gmode] button").forEach(b => b.onclick = () => { gameMode = b.dataset.gmode; draw(); });
  draw(); tabsInit(document.getElementById("app"));
}

// ---------- игрок ----------
const PROG = [["dealt", "Попал за раунд", p => div(p.dealt, p.gr), r2, 1], ["ratio", "Попал / получил", p => p.ratio, r2, 1], ["acc", "Точность", p => p.acc, pct, 1], ["recv", "Получил за раунд", p => div(p.recv, p.gr), r2, -1], ["deaths", "Смерти за раунд", p => div(p.deaths, p.gr), r2, -1], ["shots", "Выстрелы за раунд", p => div(p.shots, p.gr), one, 0]];
function progressCharts(games) {
  const list = [...games].reverse();
  if (list.length < 2) return `<p class="note">Графики прогресса появятся, когда у игрока будет хотя бы две игры.</p>`;
  const W = 320, H = 130, Lm = 8, R = 8, T = 12, B = 8;
  const x = i => Lm + i * (W - Lm - R) / (list.length - 1);
  return `<div class="prog">${PROG.map(([k, label, f, show, better]) => {
    const pts = list.map(({ g, m, p }) => { const others = m.P.map(f).filter(isFinite); return { g, v: f(p), avg: others.length ? sum(others, v => v) / others.length : 0 }; });
    const fin = pts.filter(q => isFinite(q.v)), vals = [...fin.map(q => q.v), ...pts.map(q => q.avg)];
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo || hi || 1) * .15; lo = Math.max(0, lo - pad); hi += pad;
    const y = v => T + (H - T - B) * (1 - (Math.min(v, hi) - lo) / (hi - lo || 1));
    const line = (arr, get) => arr.map((q, i) => `${i ? "L" : "M"}${x(pts.indexOf(q)).toFixed(1)} ${y(get(q)).toFixed(1)}`).join("");
    const last = fin[fin.length - 1], prev = fin[fin.length - 2], d = last && prev ? last.v - prev.v : 0;
    const good = better && d ? Math.sign(d) === better : null;
    const dTxt = !prev ? "" : Math.abs(d) < 1e-9 ? "без изменений" : (d > 0 ? "▲ " : "▼ ") + show(Math.abs(d)).replace("∞", "—");
    return panel("pchart", `<figcaption><span class="pl">${label}${better < 0 ? ' <small>· меньше лучше</small>' : ""}</span><span class="pv"><b>${last ? show(last.v) : "—"}</b><small class="pd ${good === true ? "up" : good === false ? "down" : ""}">${dTxt}${prev ? " к прошлой игре" : ""}</small></span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${label} по играм">${[0, .5, 1].map(t => `<line class="grid" x1="${Lm}" x2="${W - R}" y1="${(T + (H - T - B) * t).toFixed(1)}" y2="${(T + (H - T - B) * t).toFixed(1)}"/>`).join("")}<path class="avg" d="${line(pts, q => q.avg)}"/><path class="me" d="${line(fin, q => q.v)}"/>${fin.map(q => `<circle cx="${x(pts.indexOf(q)).toFixed(1)}" cy="${y(q.v).toFixed(1)}" r="3.5" fill="var(--uv2)"><title>${dateShort(q.g.date)}: ${show(q.v)} (среднее в игре ${show(q.avg)})</title></circle>`).join("")}</svg>
      <div class="pdots">${pts.map((q, i) => `<span class="xl" style="left:${(x(i) / W * 100).toFixed(2)}%;transform:translateX(${i === 0 ? "0" : i === pts.length - 1 ? "-100%" : "-50%"})">${dateShort(q.g.date).slice(0, 5)}</span>`).join("")}</div>`, "figure");
  }).join("")}</div><div class="plegend"><span><i class="me"></i>игрок</span><span><i class="avg"></i>среднее по всем игрокам той игры</span></div>`;
}
function viewPlayer(S, key) {
  const s = S.rows.find(r => r.key === key); if (!s) return viewHome(S);
  const games = allGames().map(x => ({ ...x, m: S.models[x.i] })).map(x => ({ ...x, p: x.m.P.find(p => p.name === s.name) })).filter(x => x.p);
  const topOf = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const tg = topOf(s.pairs), nm = topOf(s.against);
  const rank = [...S.rows].filter(r => r.games >= 3).sort((a, b) => b.mvp / b.games - a.mvp / a.games).findIndex(r => r === s) + 1;
  const names = [...new Set([...Object.keys(s.pairs), ...Object.keys(s.against)])];
  const drows = names.map(n => ({ n, gave: s.pairs[n] || 0, took: s.against[n] || 0, meet: (s.meet || {})[n] || 0 })).sort((a, b) => (b.gave + b.took) - (a.gave + a.took));
  const mx = Math.max(...drows.map(r => Math.max(r.gave, r.took)), 1);
  const best = games.reduce((a, x) => x.p.dealt > (a ? a.p.dealt : -1) ? x : a, null);
  return `<div class="page">
  ${panel("phero", `<div class="bgimg" style="--img:url(art/c-map.webp)"></div><div><div class="eyebrow">Игрок${rank ? ` · № ${rank} по ${ic("star")}` : " · меньше 3 игр"}</div><h1>${esc(s.name)}</h1>
    <div class="facts"><div class="fact"><span class="v">${s.games}</span><span class="k">${plural(s.games, ["игра", "игры", "игр"]).split(" ")[1]}</span></div><div class="fact"><span class="v">${ic("star")}${ru(s.mvp / s.games)}</span><span class="k">за игру</span></div><div class="fact"><span class="v">${fmt(s.dealt)}</span><span class="k">попаданий</span></div><div class="fact"><span class="v">${r2(s.ratio)}</span><span class="k">попал / получил</span></div><div class="fact"><span class="v">${pct(s.acc)}</span><span class="k">точность</span></div><div class="fact"><span class="v">${s.mvps}</span><span class="k">MVP игры</span></div>${s.rounds ? `<div class="fact"><span class="v">${pct(s.alive / s.rounds)}</span><span class="k">дожил до конца раунда</span></div>` : ""}</div></div>
    <div class="fig"><img src="${figure(s.name)}" alt=""></div>`)}
  <div class="noms">${tg ? panel("nomc", `<img src="${portrait(tg[0])}" alt=""><div><div class="k">Груша для битья</div><div class="n">${pLink(tg[0], S)}</div><div class="l">в кого попадал чаще всего</div></div><div class="v num">${tg[1]}</div>`) : ""}${nm ? panel("nomc", `<img src="${portrait(nm[0])}" alt=""><div><div class="k">Личный кошмар</div><div class="n">${pLink(nm[0], S)}</div><div class="l">кто чаще всего попадал в него</div></div><div class="v num">${nm[1]}</div>`) : ""}${best ? panel("nomc", `<div style="width:44px;height:44px;border-radius:50%;background:var(--uvd);display:grid;place-items:center;font-family:var(--mono);font-size:10px;color:var(--uv2)">${dateShort(best.g.date).slice(0, 5)}</div><div><div class="k">Лучшая игра</div><div class="n"><a class="pl" href="#${best.key}">${dDay(best.g.date).day} ${dDay(best.g.date).monFull}</a></div><div class="l">больше всего попаданий за игру</div></div><div class="v num">${best.p.dealt}</div>`) : ""}</div>
  ${ptabs([["games", "По играм"], ["prog", "Прогресс"], ["duels", "Дуэли"], ["guns", "Пушки"]])}
  ${pane("games", panel("tbl", `<div class="sc" style="--h:none"><table class="sticky1"><thead><tr><th class="l">Игра</th><th class="l">Команда</th><th>Попал</th><th>Получил</th><th>Попал / получил</th><th>Смерти</th><th>Выстрелы</th><th>Точность</th><th>${ic("star")}</th></tr></thead>
    <tbody>${games.map(({ g, key, p }) => `<tr><td class="l"><a class="pl" href="#${key}">${dateShort(g.date)}</a><small>${esc(g.location || "")}</small></td><td class="l">${p.teams.map(t => `<span class="dot" style="--c:${tc(t)}"></span>`).join("")} ${gLink(S.guns.find(z => z.gkey === p.gkey)) || esc(p.gun)}${p.swap ? ' <small>смена команды</small>' : ""}</td>
      <td class="num">${A(p.e.dealt)}${p.dealt}</td><td class="num">${A(p.e.recv)}${p.recv}</td><td class="num">${A(p.e.ratio)}${r2(p.ratio)}</td><td class="num">${A(p.e.deaths)}${p.deaths}</td><td class="num">${A(p.e.shots)}${fmt(p.shots)}</td><td class="num">${A(p.e.acc)}${pct(p.acc)}</td><td class="num"><b>${fmt(p.mvp)}</b></td></tr>`).join("")}</tbody></table></div>${games.some(x => x.p.est.size || x.p.e.dealt) ? `<div class="ft">«≈» — оценка: тагер в той игре не считан, цифры восстановлены приблизительно.</div>` : ""}`))}
  ${pane("prog", `${progressCharts(games)}<p class="note">Одна точка — одна игра. Попадания, смерти и выстрелы поделены на число раундов, чтобы игры разной длины можно было сравнивать. Пунктир — среднее по всем игрокам той же игры.</p>`)}
  ${pane("duels", drows.length ? panel("dcard", `<div class="dhead"><div><div class="n">Все соперники</div><div class="s">сумма по всем играм</div></div></div><div class="drows" data-sortable><div class="drow hd"><span></span><span class="half lft"><button data-sk="gave">попал</button></span><span class="half rgt"><button data-sk="took">получил</button></span><span class="bal"><button data-sk="tot" aria-pressed="true">всего</button></span><span class="bal"><button data-sk="ratio">коэф.</button></span></div>
    ${drows.map(r => `<div class="drow" data-gave="${r.gave}" data-took="${r.took}" data-tot="${r.gave + r.took}" data-ratio="${r.took ? r.gave / r.took : 1e9}"><span class="nm">${pLink(r.n, S)}</span><span class="half lft"><span class="num">${r.gave}</span><i style="--c:var(--uv);--w:${(r.gave / mx * 72).toFixed(1)}%"></i></span><span class="half rgt"><i style="--c:var(--mute);--w:${(r.took / mx * 72).toFixed(1)}%"></i><span class="num">${r.took}</span></span><span class="bal">${r.gave + r.took}</span><span class="bal">${r.took ? r2(r.gave / r.took) : "∞"}</span></div>`).join("")}</div>`, "div", 'style="max-width:720px"') : `<p class="note">Дуэлей пока нет.</p>`)}
  ${pane("guns", `<div class="sect">${panel("tbl", `<div class="hd"><span class="mono">на каких пушках · сумма по играм</span></div><div class="sc" style="--h:none"><table id="pGunTable"></table></div>`)}${s.byCls && s.byCls.auto && s.byCls.pistol ? panel("tbl", `<div class="hd"><span class="mono">автомат и пистолет · среднее за игру</span></div><div class="sc" style="--h:none"><table id="pClsTable"></table></div>`) : ""}</div>`)}
  </div>`;
}
function playerInit(S, key) {
  const s = S.rows.find(r => r.key === key); if (!s) return;
  statTable("pGunTable", statCols(["name", "Пушка", r => r.gun ? r.gun.name : ""]), s.gunList, r => gLink(r.gun), "games");
  if (s.byCls && s.byCls.auto && s.byCls.pistol) statTable("pClsTable", statCols(["name", "Оружие", r => CLS[r.cls]], true), [s.byCls.auto, s.byCls.pistol], r => esc(CLS[r.cls]), "dealtPG");
  tabsInit(document.getElementById("app"));
}

// ---------- пушка ----------
function viewGun(S, key) {
  const g = S.guns.find(z => z.key === key); if (!g) return viewHome(S);
  const games = allGames().map(x => ({ ...x, m: S.models[x.i] })).map(x => ({ ...x, p: x.m.P.flatMap(gunUnits).find(p => p.gkey === g.gkey) })).filter(x => x.p);
  const best = [...g.players].filter(r => isFinite(r.ratio)).sort((a, b) => b.ratio - a.ratio)[0];
  const art = gunArt(g);
  return `<div class="page">
  ${panel("phero", `<div class="bgimg" style="--img:url(art/c-map.webp)"></div><div><div class="eyebrow">Пушка · ${genLabel(g)}</div><h1>${esc(g.name)}</h1>
    <div class="facts"><div class="fact"><span class="v">${g.games}</span><span class="k">${plural(g.games, ["игра", "игры", "игр"]).split(" ")[1]}</span></div><div class="fact"><span class="v">${g.players.length}</span><span class="k">${plural(g.players.length, ["игрок", "игрока", "игроков"]).split(" ")[1]}</span></div><div class="fact"><span class="v">${one(g.dealt / g.games)}</span><span class="k">попал за игру</span></div><div class="fact"><span class="v">${r2(g.ratio)}</span><span class="k">попал / получил</span></div><div class="fact"><span class="v">${pct(g.acc)}</span><span class="k">точность</span></div></div>
    ${best && g.players.length > 1 ? `<p class="note">Лучше всех с этой пушкой по коэффициенту — ${pLink(best.name, S)} (${r2(best.ratio)}).</p>` : ""}</div>
    ${art ? `<div class="gunart"><img src="${art}" alt=""></div>` : ""}`)}
  ${ptabs([["who", "Кто с ней играл"], ["games", "По играм"]])}
  ${pane("who", panel("tbl", `<div class="sc" style="--h:none"><table id="gunPlayers" class="sticky1"></table></div><div class="ft">Сумма по всем играм игрока с этим тагером.</div>`))}
  ${pane("games", panel("tbl", `<div class="sc" style="--h:none"><table class="sticky1"><thead><tr><th class="l">Игра</th><th class="l">Игрок</th><th>Попал</th><th>Получил</th><th>Попал / получил</th><th>Смерти</th><th>Выстрелы</th><th>Точность</th></tr></thead>
    <tbody>${games.map(({ g: gm, key, p }) => `<tr><td class="l"><a class="pl" href="#${key}">${dateShort(gm.date)}</a><small>${esc(gm.location || "")}</small></td><td class="l">${pLink(p.name, S)}</td><td class="num">${A(p.e.dealt)}${p.dealt}</td><td class="num">${A(p.e.recv)}${p.recv}</td><td class="num">${A(p.e.ratio)}${r2(p.ratio)}</td><td class="num">${A(p.e.deaths)}${p.deaths}</td><td class="num">${A(p.e.shots)}${fmt(p.shots)}</td><td class="num">${A(p.e.acc)}${pct(p.acc)}</td></tr>`).join("")}</tbody></table></div>`))}
  </div>`;
}
function gunInit(S, key) {
  const g = S.guns.find(z => z.key === key); if (!g) return;
  statTable("gunPlayers", statCols(["name", "Игрок", r => r.name]), g.players, r => pLink(r.name, S), "ratio");
  tabsInit(document.getElementById("app"));
}

// ---------- маршрутизация ----------
const app = document.getElementById("app");
let SEASON = null, homeShown = false;
function crumb(html) { const el = document.getElementById("crumb"); el.innerHTML = html; }
const RANK = h => /^s[1-4]$/.test(h) || h === "home" ? 0 : h === "games" || h === "itogi" || h === "duels" ? 1 : 2;
let lastRoute = null;
// «назад» ведёт туда, откуда пришли: стек пройденных экранов с позицией прокрутки и открытой вкладкой
const NAV = []; let restore = null;
const isHomeH = h => /^s[1-4]$/.test(h) || h === "home";
function hereState(prev) {
  const main = document.getElementById("main"); let h = prev;
  if (isHomeH(prev)) { const mid = main.scrollTop + main.clientHeight / 2; const sl = [...document.querySelectorAll(".slide")].filter(x => x.offsetTop <= mid).pop(); if (sl) h = sl.id; }
  const tab = document.querySelector(".ptabs a.on");
  return { h, y: main.scrollTop, tab: tab ? tab.dataset.tab : null };
}
function navLabel(S, h) {
  if (isHomeH(h)) return { s1: "Главная", s2: "Игры", s3: "Игроки", s4: "Пушки", home: "Главная" }[h];
  if (h === "games") return "Все игры";
  if (h === "itogi") return "Итоги";
  if (h === "duels") return "Дуэли";
  if (h.startsWith("game-")) { const x = allGames().find(z => z.key === h); if (x) { const d = dDay(x.g.date); return `Игра ${d.day} ${d.monFull}`; } }
  const r = S.rows.find(z => z.key === h) || S.guns.find(z => z.key === h); return r ? r.name : "Назад";
}
function render() {
  const h = (location.hash || "#s1").slice(1), prev = lastRoute; lastRoute = h;
  restore = null;
  if (prev !== null && prev !== h) {
    const top = NAV[NAV.length - 1];
    if (top && top.h === h) { restore = NAV.pop(); if (isHomeH(h)) NAV.length = 0; }
    else if (isHomeH(h)) { if (!isHomeH(prev)) NAV.length = 0; }
    else NAV.push(hereState(prev));
  }
  const pageChange = prev !== null && (RANK(prev) !== RANK(h) || (RANK(h) === 2 && prev !== h));
  if (pageChange && document.startViewTransition && !matchMedia("(prefers-reduced-motion:reduce)").matches) {
    document.documentElement.dataset.dir = !restore && RANK(h) >= RANK(prev) ? "fwd" : "back";
    document.startViewTransition(() => draw(h));
  } else draw(h);
}
function draw(h) {
  const S = SEASON || (SEASON = season()), main = document.getElementById("main");
  const isHome = /^s[1-4]$/.test(h) || h === "home";
  document.body.classList.toggle("detail", !isHome);
  document.getElementById("dots").hidden = !isHome;
  if (isHome) {
    const fresh = !homeShown;
    if (fresh) { app.innerHTML = viewHome(S); homeInit(S); homeShown = true; main.classList.add("snap"); }
    crumb("");
    const target = document.getElementById(h === "home" ? "s1" : h); if (target) target.scrollIntoView({ behavior: fresh ? "instant" : "smooth" });
    if (restore && fresh) main.scrollTo({ top: restore.y, behavior: "instant" });
    return;
  }
  homeShown = false; main.classList.remove("snap");
  let html, after = () => {}, back = "#s1", label = "";
  if (h === "games") { html = viewGames(S); after = gamesInit; back = "#s2"; label = "Игры"; }
  else if (h === "itogi") { html = viewItogi(S); after = itogiInit; back = "#itogi"; label = ""; }
  else if (h === "duels") { html = viewDuels(S); after = () => duelsInit(S); back = "#duels"; label = ""; }
  else if (h.startsWith("game-")) { html = viewGame(S, h); after = () => gameInit(S, h); back = "#s2"; label = "Игры"; }
  else if (/^p\d+$/.test(h)) { html = viewPlayer(S, h); after = () => playerInit(S, h); back = "#s3"; label = "Игроки"; }
  else if (/^gun\d+$/.test(h)) { html = viewGun(S, h); after = () => gunInit(S, h); back = "#s4"; label = "Пушки"; }
  else { location.hash = "#s1"; return; }
  app.innerHTML = `<div class="wrap">${html}</div>`; after(); main.scrollTo(0, 0);
  if (restore) { if (restore.tab) { const t = document.querySelector(`.ptabs a[data-tab="${restore.tab}"]`); if (t) t.click(); } const y = restore.y; main.scrollTo({ top: y, behavior: "instant" }); requestAnimationFrame(() => main.scrollTo({ top: y, behavior: "instant" })); }
  const from = NAV[NAV.length - 1];
  crumb(from ? `<a href="#${from.h}" data-back>← ${esc(navLabel(S, from.h))}</a>` : `<a href="${label ? back : "#s1"}">← ${label || "Главная"}</a>`);
  document.querySelectorAll("#tabs a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === back));
  countUp();
}
function countUp(root = app, again = false) {
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  root.querySelectorAll("[data-count], .fact .v").forEach(el => { const raw = el.dataset.raw || (el.dataset.raw = el.textContent), v = parseFloat(raw.replace(/\s/g, "").replace(",", ".")); if (!isFinite(v) || v < 10 || raw.includes(":") || (el.__done && !again)) return; el.__done = true;
    const run = el.__run = (el.__run || 0) + 1, t0 = performance.now() + (again ? 500 : 300); const tick = t => { if (el.__run !== run) return; const k = Math.min(1, Math.max(0, (t - t0) / 1100)), e = 1 - Math.pow(1 - k, 3); el.textContent = raw.includes("%") ? (v * e).toFixed(1).replace(".", ",") + "%" : ru(v * e); if (k < 1) requestAnimationFrame(tick); else el.textContent = raw; }; requestAnimationFrame(tick); });
}
// сортировка дуэлей по заголовкам
app.addEventListener("click", e => {
  const b = e.target.closest(".drows[data-sortable] .drow.hd button"); if (!b) return;
  const box = b.closest(".dpart") || b.closest(".drows"), k = b.dataset.sk, desc = !(b.getAttribute("aria-pressed") === "true" && b.dataset.dir !== "asc");
  box.querySelectorAll(".drow.hd button").forEach(x => { x.setAttribute("aria-pressed", x === b); delete x.dataset.dir; });
  b.dataset.dir = desc ? "desc" : "asc";
  const rows = [...box.querySelectorAll(".drow:not(.hd)")].sort((x, y) => (desc ? -1 : 1) * (x.dataset[k] - y.dataset[k]) || (y.dataset.tot - x.dataset.tot));
  box.append(...rows);
});
// карточка последней игры целиком ведёт на разбор игры
document.addEventListener("click", e => { if (e.target.closest("a, button")) return; const c = e.target.closest("[data-go]"); if (c && !getSelection().toString()) location.hash = c.dataset.go; });
// «назад» в шапке — настоящий шаг назад по истории, чтобы кнопка браузера и ссылка вели себя одинаково
document.addEventListener("click", e => { const a = e.target.closest("a[data-back]"); if (!a || !NAV.length) return; e.preventDefault(); const want = a.getAttribute("href"), was = location.hash;
  history.back(); setTimeout(() => { if (location.hash === was) location.hash = want; }, 350); });
addEventListener("hashchange", render);

// ---------- загрузка ----------
async function loadGames() {
  const bust = "?v=" + Date.now();
  let list = [];
  try { const r = await fetch(ROOT + "games/index.json" + bust, { cache: "no-store" }); if (r.ok) list = (await r.json()).map(x => typeof x === "string" ? { file: x } : x).map(x => ({ file: x.file, url: ROOT + "games/" + x.file + (x.v ? "?v=" + x.v : "") })); } catch (e) {}
  const games = await Promise.all(list.map(async x => { try { const r = await fetch(x.url); if (!r.ok) return null; const g = await r.json(); return g && Array.isArray(g.players) ? { ...g, file: x.file } : null; } catch (e) { return null; } }));
  try { const r = await fetch(ROOT + "replays/index.json" + bust, { cache: "no-store" }); if (r.ok) DATA.replays = await r.json(); } catch (e) {}
  DATA.games = games.filter(Boolean).sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.file.localeCompare(b.file));
}
// интро и тактический фон: линза за курсором, сетка точек, волна по клику
(() => {
  const root = document.documentElement; root.classList.add("intro");
  requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.remove("intro"); root.classList.add("go"); }));
  const lens = document.querySelector(".lens"), stage = document.querySelector(".stage"), cv = document.getElementById("fx"), ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const main = document.getElementById("main"); let lx = -1, ly = -1, lst = -1, lpq = 0; let W = 0, H = 0, dpr = 1, dots = [], mouse = false, tx = innerWidth * .6, ty = innerHeight * .4, x = tx, y = ty, waves = [];
  const GAP = 30;
  const ret = document.querySelector(".ret");
  let base = null; // фоновые точки рисуются один раз
  const resize = () => { dpr = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = []; const ox = (W % GAP) / 2, oy = (H % GAP) / 2; for (let yy = oy; yy <= H; yy += GAP) for (let xx = ox; xx <= W; xx += GAP) dots.push(xx, yy);
    base = document.createElement("canvas"); base.width = cv.width; base.height = cv.height; const b = base.getContext("2d"); b.setTransform(dpr, 0, 0, dpr, 0, 0); b.fillStyle = "rgba(243,239,230,.07)";
    for (let k = 0; k < dots.length; k += 2) b.fillRect(dots[k] - .6, dots[k + 1] - .6, 1.2, 1.2); dirty = true; };
  let dirty = true;
  resize(); addEventListener("resize", resize);
  addEventListener("pointermove", e => { if (e.pointerType === "touch") return; mouse = true; root.classList.add("mouse"); tx = e.clientX; ty = e.clientY; }, { passive: true });
  document.addEventListener("pointerleave", () => { mouse = false; root.classList.remove("mouse"); });
  addEventListener("pointerdown", e => { if (waves.length < 3) waves.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (e.pointerType === "touch") { tx = e.clientX; ty = e.clientY; } }, { passive: true });
  const NB = 8, paths = Array.from({ length: NB }, () => null);
  let lastT = 0;
  const frame = now => {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    if (!mouse) { if (now - lastT < 33) return; tx = W * (.5 + .36 * Math.cos(now / 4200)); ty = H * (.45 + .28 * Math.sin(now / 3100)); }
    lastT = now;
    x += (tx - x) * .2; y += (ty - y) * .2;
    const moved = Math.abs(x - lx) + Math.abs(y - ly) > .3; lx = x; ly = y;
    if (moved) {
      lens.style.setProperty("--x", x.toFixed(1) + "px"); lens.style.setProperty("--y", y.toFixed(1) + "px");
      if (ret) ret.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      const ry = ((x / W - .5) * 5).toFixed(2) + "deg", rx = ((.5 - y / H) * 4).toFixed(2) + "deg";
      for (const el of [stage, lens]) { el.style.setProperty("--ry", ry); el.style.setProperty("--rx", rx); }
    }
    // подсветка рамок панелей рядом с прицелом
    if (moved || main.scrollTop !== lst || now - lpq > 400) { lst = main.scrollTop; lpq = now;
      for (const p of document.querySelectorAll(".panel")) {
        const r = p.getBoundingClientRect(), near = x > r.left - 260 && x < r.right + 260 && y > r.top - 260 && y < r.bottom + 260 && r.bottom > 0 && r.top < H;
        if (near) { p.style.setProperty("--px", (x - r.left).toFixed(0) + "px"); p.style.setProperty("--py", (y - r.top).toFixed(0) + "px"); p.__pg = 1; }
        else if (p.__pg) { p.style.removeProperty("--px"); p.style.removeProperty("--py"); p.__pg = 0; }
      }
    }
    waves = waves.filter(w => now - w.t < 1100);
    // холст перерисовываем только когда что-то изменилось
    if (!moved && !waves.length && !dirty) return;
    dirty = waves.length > 0;
    ctx.clearRect(0, 0, W, H); ctx.drawImage(base, 0, 0, W, H);
    const S2 = 2 * 140 * 140, R2 = 420 * 420;
    for (let q = 0; q < NB; q++) paths[q] = null;
    const wv = waves.map(w => { const age = Math.max(0, (now - w.t) / 1100); return { x: w.x, y: w.y, R: age * Math.max(W, H) * .7, a: (1 - age) * 1.1 }; });
    for (let k = 0; k < dots.length; k += 2) {
      const px = dots[k], py = dots[k + 1], dx = px - x, dy = py - y, d2 = dx * dx + dy * dy;
      let i = d2 < R2 ? Math.exp(-d2 / S2) : 0;
      for (const w of wv) { const wx = px - w.x, wy = py - w.y, dd = Math.sqrt(wx * wx + wy * wy) - w.R; if (dd > -90 && dd < 90) i += Math.exp(-dd * dd / 900) * w.a * .7; }
      if (i < .03) continue;
      const d = Math.sqrt(d2) || 1, push = 10 * Math.exp(-d2 / S2), qx = px + dx / d * push, qy = py + dy / d * push, r = .7 + 1.1 * Math.min(i, 1.2);
      const q = Math.min(NB - 1, Math.floor(Math.min(i, 1.1) / 1.1 * NB)); const pth = paths[q] || (paths[q] = new Path2D());
      pth.moveTo(qx + r, qy); pth.arc(qx, qy, r, 0, 6.2832);
    }
    for (let q = 0; q < NB; q++) if (paths[q]) { ctx.fillStyle = `rgba(226,220,246,${Math.min(.45, .08 + .38 * (q + .5) / NB * 1.1).toFixed(3)})`; ctx.fill(paths[q]); }
    for (const w of wv) { ctx.strokeStyle = `rgba(226,220,246,${(.22 * w.a).toFixed(3)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(w.x, w.y, w.R, 0, 6.2832); ctx.stroke(); }
    if (mouse) { ctx.strokeStyle = "rgba(226,220,246,.04)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
  };
  if (!still) requestAnimationFrame(frame); else { ctx.drawImage(base, 0, 0, W, H); }
  document.querySelectorAll('a[href^="#s"]').forEach(d => d.addEventListener("click", e => { if (location.hash === d.getAttribute("href")) { e.preventDefault(); render(); } }));
})();
app.innerHTML = `<div class="empty">Загружаю игры…</div>`;
loadGames().then(() => { render(); countUp(); }, e => { app.innerHTML = `<div class="empty">Не получилось загрузить игры: ${esc(e.message)}</div>`; });
