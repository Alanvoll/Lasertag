// Лазертаг · новый сайт. Один экран из четырёх блоков (Главная, Игры, Игроки, Пушки) и страницы разборов: игра, игрок, пушка.
const REPO = "Alanvoll/Lasertag";
const ROOT = "../"; // новый дизайн лежит в /new/, игры берутся из общих games/ и replays/ основного сайта
// Данные: games/*.json (список в games/index.json), модель — model.js (та же, что на старом сайте).

// ---------- аватары ----------
const FEM_NAMES = ["Виталина", "Даша", "Кобра", "Лина", "Маша", "Саша", "Яна"];
const FEM_AVA = ["a02", "a07", "a09", "a12", "a14", "a18", "a21", "a24", "a29", "a33", "a35", "a50", "a51", "a52", "a53", "a54", "a55"];
const AVA_SET = { "Яна": "a50", "Глеб": "a30", "Кобра": "a12", "Арсений": "a42", "Женя": "a43" }; // выбор игроков; остальным — постоянный случайный
function avaOf(name) {
  if (AVA_SET[name]) return AVA_SET[name];
  const fem = FEM_NAMES.includes(name), pool = [];
  for (let i = 1; i <= 56; i++) { const id = "a" + String(i).padStart(2, "0"); if (FEM_AVA.includes(id) === fem && !Object.values(AVA_SET).includes(id)) pool.push(id); }
  let h = 7; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
// пока у всех игроков общий шаблон «неизвестный боец»; свои аватары подключим позже (avaOf)
const portrait = n => `art/av/unknown.jpg`, figure = n => `art/body/unknown.webp`;
const TEAM_HEX = { 0: "var(--red)", 1: "var(--blue)", 2: "var(--yellow)", 3: "var(--green)" };
const tc = t => TEAM_HEX[t];
const GUN_ART = [["p90", "p90"], ["винторез", "vintorez"], ["пистолет", "pistol"], ["феникс", "phoenix"], ["ar15", "ar15"], ["скорпион", "scorpion"], ["комар", "komar"], ["гадюка", "gadyuka"], ["хищник", "predator"]];
// старый арт пушек (GUN_ART) Антон забраковал 06.11 — пока у всех пушек заглушка «неизвестная пушка»: автомат или пистолет, вариант по имени
const GUN_OWN = false;
const gunArt = g => { const n = (g.name || "").toLowerCase(); const f = GUN_OWN && GUN_ART.find(([k]) => n.includes(k)); if (f) return `art/gun/${f[1]}.webp`;
  let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return `art/gun/unknown-${/пистолет/.test(n) ? "pistol" : "rifle"}-${1 + h % 2}.webp`; };
const PLACE_ART = { "Склады": ["art/place/sklady-1.webp", "art/place/sklady-2.webp"], "Зубр": ["art/place/zubr-1.webp", "art/place/zubr-2.webp"] };
// у каждой площадки несколько картинок: игра берёт свою по дате, чтобы соседние игры отличались
const placeArt = (l, key = "") => { const a = PLACE_ART[l]; if (!a) return "art/place/empty.webp"; let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return a[h % a.length]; };

const ru = n => Math.round(n).toLocaleString("ru-RU");
const MONTHS_S = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const dDay = d => { const [y, m, dd] = (d || "").split("-").map(Number); return { day: dd, mon: MONTHS_S[m - 1], monFull: MONTHS[m - 1], y }; };
const A = approx;

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
  const teams = m.teamIds.map(t => { const mem = m.P.filter(p => p.teams.includes(t) && m.shareT(p, t) > .5).sort((a, b) => m.mvpT(b, t) - m.mvpT(a, t));
    return { t, name: TEAMS[t].name, score: (sc.parts.find(x => x[0] === t) || [0, 0])[1], hits: hitsT[t] || 0, mvp: mem[0] ? mem[0].name : "", mvpDealt: mem[0] ? sum(m.P, v => m.valT(mem[0], v, t)) : 0, n: m.P.filter(p => p.teams.includes(t)).length }; });
  const win = [...teams].sort((a, b) => b.score - a.score)[0].t;
  return { m, key: gameKey(m.g), date: m.g.date, loc: m.g.location || "", kind: sc.kind, teams, win, rounds: m.winners.length, players: m.P.length, hits: sum(teams, t => t.hits), top: m.mvp.name, awards: m.g.awards || [], winners: m.winners, swaps: m.swaps };
}
const roundsStrip = (g, big = false) => `<span class="rounds${big ? " big" : ""}">${g.winners.map((w, i) => (g.swaps.includes(i) ? `<i class="sw"></i>` : "") + (w == null ? `<i class="none">${big ? i + 1 : ""}</i>` : `<i style="--c:${tc(w)}" title="Раунд ${i + 1}: ${TEAMS[w].name}">${big ? i + 1 : ""}</i>`)).join("")}</span>`;
const scoreHtml = (g, cls = "sc") => `<div class="${cls} num"><span style="color:${tc(g.teams[0].t)}">${ru(g.teams[0].score)}</span><i>:</i><span style="color:${tc(g.teams[1].t)}">${ru(g.teams[1].score)}</span>${g.kind === "попадания" ? `<small>попадания</small>` : ""}</div>`;


const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const monthKey = d => (d || "").slice(0, 7), monthName = d => { const [y, m] = (d || "").split("-").map(Number); return `${MONTHS_NOM[m - 1]} ${y}`; };
function gameTile(g, k = 0) {
  const d = dDay(g.date);
  const tt = (x, cls) => `<div class="${cls}"><div class="t${x.t === g.win ? " w" : ""}" style="--c:${tc(x.t)}">${x.name}</div><div class="mv"><img src="${portrait(x.mvp)}" alt=""><span><b>${esc(x.mvp)}</b><small>MVP · ${x.mvpDealt} попад.</small></span></div></div>`;
  return panel("gcard A", `<div class="d"><b>${d.day} ${d.mon}</b><span class="mono">${esc(g.loc)}</span></div>${scoreHtml(g)}<div class="tt">${tt(g.teams[0], "")}${tt(g.teams[1], "r")}</div><div class="ft">${roundsStrip(g)}<span class="mono">${g.players} игр.${g.rounds ? ` · ${g.rounds} р.` : ""} · ${ru(g.hits)} поп.</span></div>`, "a", `href="#${g.key}" style="--k:${Math.min(k, 8)}" data-loc="${esc(g.loc)}"`);
}
function miniStrip(cards, cur) {
  let html = "", mk = "";
  cards.forEach((g, i) => { const d = dDay(g.date); if (monthKey(g.date) !== mk) { mk = monthKey(g.date); html += `<div class="gmon"><span>${monthName(g.date).split(" ")[0]}</span></div>`; }
    html += `<a class="gmini${g.key === cur ? " cur" : ""}" href="#${g.key}" style="--k:${Math.min(i, 10)}"><span class="dt"><b>${d.day}</b> ${d.mon}</span><span class="pl mono">${esc(g.loc)}</span><span class="s num"><span style="color:${tc(g.teams[0].t)}">${ru(g.teams[0].score)}</span><i>:</i><span style="color:${tc(g.teams[1].t)}">${ru(g.teams[1].score)}</span></span><span class="r mono">${g.kind === "попадания" ? "по попаданиям" : `${g.rounds} раунд.`} · ${g.players} игр.</span></a>`; });
  return html;
}

// ---------- главная ----------
function viewHome(S) {
  const H = homeData(S), L = gameCard(H.last), dL = dDay(L.date);
  const nG = H.models.length, regs = S.rows.filter(r => r.games >= 3).length, shotsAll = sum(H.models, m => sum(m.P, p => p.shots));
  const sumx = [[nG, "игр", H.locs.map(l => `${esc(l)} ${H.models.filter(m => m.g.location === l).length}`).join(" · ")], [H.rounds, "раундов", `≈${ru(H.rounds / nG)} за игру`], [S.rows.length, "бойца", `${regs} играли от 3 раз`], [H.hits, "попаданий", `≈${ru(H.hits / nG)} за игру`], [(H.acc * 100).toFixed(1).replace(".", ",") + "%", "точность", `${ru(shotsAll)} выстрелов`], (hg => [sum(hg.P, p => p.dealt), "попаданий рекорд", `самая жаркая игра · ${dDay(hg.g.date).day} ${dDay(hg.g.date).mon}`])(H.models.reduce((x, y) => sum(y.P, p => p.dealt) > sum(x.P, p => p.dealt) ? y : x))];
  const allP = H.models.flatMap(m => m.P), deathsAll = sum(allP, p => p.deaths), aliveP = allP.filter(p => p.alive != null && p.nR), aliveR = div(sum(aliveP, p => p.alive), sum(aliveP, p => p.nR));
  const sizes = H.models.map(m => m.P.length), cardsAll = H.models.map(gameCard), byRounds = cardsAll.filter(g => g.kind !== "попадания");
  const longest = [...byRounds].sort((x, y) => y.rounds - x.rounds)[0], rout = [...byRounds].sort((x, y) => Math.abs(y.teams[0].score - y.teams[1].score) - Math.abs(x.teams[0].score - x.teams[1].score))[0];
  const accTop = S.rows.filter(r => r.games >= 3 && isFinite(r.acc)).sort((x, y) => y.acc - x.acc)[0], dd = d => { const x = dDay(d); return `${x.day} ${x.mon}`; };
  { const ga = H.models.map(m => div(sum(m.P, p => p.dealt), sum(m.P, p => p.shots))).filter(isFinite); sumx[4][2] = `по играм от ${pct(Math.min(...ga))} до ${pct(Math.max(...ga))}`; }
  sumx.push([deathsAll, "смертей", `≈${ru(deathsAll / nG)} за игру`], [shotsAll, "выстрелов", `≈${ru(shotsAll / nG)} за игру`], [Math.round(sum(sizes, x => x) / nG), "бойцов в игре", `от ${Math.min(...sizes)} до ${Math.max(...sizes)}`],
    [(aliveR * 100).toFixed(1).replace(".", ",") + "%", "дожили до конца", "раундов на бойца"], [longest ? longest.rounds : "—", "раундов рекорд", longest ? `самая долгая игра · ${dd(longest.date)}` : ""], [rout ? `${rout.teams[0].score}:${rout.teams[1].score}` : "—", "крупнейший разгром", rout ? dd(rout.date) : ""]);
  const maxR = H.top[0] ? H.top[0].rating : 1, gS = { hits: sum(L.m.P, p => p.dealt), shots: sum(L.m.P, p => p.shots), deaths: sum(L.m.P, p => p.deaths) }; gS.acc = div(gS.hits, gS.shots);
  const b1 = `<div class="hero center">
    <div><h1 class="one"><span class="w"><i>Статистика</i></span> <span class="w" style="color:var(--uv2)"><i>сезона</i></span></h1><div class="mono A sdate">${dDay(H.first).day} ${dDay(H.first).monFull} — ${dL.day} ${dL.monFull}</div></div>
  </div>
  ${panel("sumx A", `<div class="hd"><span class="mono"><span class="blink"></span>сводка сезона</span><span class="mono">обновлено <b>${dateShort(L.date)}</b></span></div><div class="cells">${sumx.map(([v, l, s], k) => `<div class="cell A" style="--k:${k}"><div class="num" data-count>${typeof v === "number" ? ru(v) : v}</div><div class="lab">${l}</div><div class="sub">${s}</div></div>`).join("")}</div>`)}
  <div class="home2 h2b">
    ${panel("lastc lg2 A", `<div class="hd"><h3>${dL.day} ${dL.monFull}</h3><span class="mono">${esc(L.loc)} · <b>${L.players}</b> ${plural(L.players, ["игрок", "игрока", "игроков"]).split(" ")[1]}${L.rounds ? ` · <b>${L.rounds}</b> ${plural(L.rounds, ["раунд", "раунда", "раундов"]).split(" ")[1]}` : ""}</span></div>
      <div class="lgb"><div class="lgl A">
        <div class="lgt">${L.teams.map(t => `<span class="t${t.t === L.win ? " w" : ""}" style="--c:${tc(t.t)}">${t.n} чел.</span>`).join("")}</div>
        ${scoreHtml(L)}
        <div class="lgm">${L.teams.map((t, k) => `<a class="lgmv${k ? " r" : ""}" href="#${(S.rows.find(r => r.name === t.mvp) || {}).key || L.key}" style="--c:${tc(t.t)}"><img src="${portrait(t.mvp)}" alt=""><span><small>MVP команды</small><b>${esc(t.mvp)}</b><em>${t.mvpDealt} попаданий</em></span></a>`).join("")}</div>
      </div><div class="lgr A">
        <a class="lgmvp" href="#${(S.rows.find(r => r.name === L.top) || {}).key || L.key}"><img src="${portrait(L.top)}" alt=""><span><small>MVP игры</small><b>${esc(L.top)}</b><em>рейтинг ${ru(L.m.mvp.mvp)} · ${L.m.mvp.dealt} попаданий</em></span></a>
        <div class="gkv"><div><b>${ru(gS.hits)}</b><span>попаданий</span></div><div><b>${pct(gS.acc)}</b><span>точность</span></div><div><b>${ru(gS.deaths)}</b><span>смертей</span></div><div><b>${ru(gS.shots)}</b><span>выстрелов</span></div></div>
      </div></div>
      <div class="rlog fill A"><span class="mono">раунды</span>${roundsStrip(L)}<a class="lnk mono" href="#${L.key}">разбор игры →</a></div>`, "div", `data-go="#${L.key}"`)}
    ${panel("topl top3 A", `<div class="hd"><span class="mono">Топ-3 сезона · от 3 игр</span><a class="lnk mono" href="#s3" style="color:var(--ink)">все игроки →</a></div><div class="tcards">${H.top.slice(0, 3).map((p, k) => `<a class="tcard A m${k + 1}" style="--k:${k}" href="#${p.r.key}"><img src="${portrait(p.name)}" alt=""><span class="no">${k + 1}</span><span class="info"><b>${esc(p.name)}</b><small>${plural(p.games, ["игра", "игры", "игр"])}</small><span class="v num">${ru(p.rating)}<em>рейтинг</em></span></span></a>`).join("")}</div>`)}
  </div>`;
  // блок 2: игры — большая последняя игра + лента всех игр
  const cards = H.models.map(gameCard), G = cards[0], dG = dDay(G.date), gp = [...G.m.P].sort((x, y) => y.mvp - x.mvp).slice(0, 5);
  const gTeam = (t, cls) => `<div class="gbt ${cls}" style="--c:${tc(t.t)}"><div class="t${t.t === G.win ? " w" : ""}">${t.n} чел.</div><a class="gbm" href="#${(S.rows.find(r => r.name === t.mvp) || {}).key || G.key}"><img src="${portrait(t.mvp)}" alt=""><span><small>MVP команды</small><b>${esc(t.mvp)}</b><em>${t.mvpDealt} попаданий</em></span></a></div>`;
  const b2 = `<div class="shead A"><h2>Игры · ${cards.length}</h2><a class="allg" href="#games">все игры <i>→</i></a></div>
  ${panel("gbig A", `<div class="bgimg" style="--img:url(${placeArt(G.loc, G.date)})"></div>
    <div class="gbh"><div><div class="mono"><span class="blink"></span>последняя игра · ${esc(G.loc)}</div><h3>${dG.day} ${dG.monFull}</h3></div><div class="mono">${G.players} игроков · ${G.rounds} раунда · ${ru(G.hits)} попаданий</div></div>
    <div class="gbb"><div class="gbs">${gTeam(G.teams[0], "")}${scoreHtml(G)}${gTeam(G.teams[1], "r")}</div>
      <div class="gtop"><div class="gth mono"><span>#</span><span>лучшие в игре</span><span>попал</span><span>получил</span><span>п / п</span><span>рейтинг</span></div>${gp.map((p, k) => `<a class="gtr" href="#${(S.rows.find(r => r.name === p.name) || {}).key || G.key}"><span class="no">${k + 1}</span><span class="n">${p.teams.map(t => `<i style="--c:${tc(t)}"></i>`).join("")}${esc(p.name)}</span><span class="num">${p.dealt}</span><span class="num">${p.recv}</span><span class="num">${r2(p.ratio)}</span><span class="num v">${ru(p.mvp)}</span></a>`).join("")}</div></div>
    <div class="rlog fill gbr"><span class="mono">раунды</span>${roundsStrip(G)}<a class="lnk mono" href="#${G.key}">разбор игры →</a></div>`, "div", `data-go="#${G.key}"`)}
  <div class="gstripw A"><button class="garr l" data-dir="-1" aria-label="Назад">‹</button><div class="gstrip" id="gstrip">${miniStrip(cards, G.key)}</div><button class="garr r" data-dir="1" aria-label="Вперёд">›</button></div>`;
  // блок 3: игроки
  const D = H.duel;
  const nomTile = (k, lab, f, show, ok = r => r.games >= 3) => { const list = S.rows.filter(r => ok(r) && isFinite(f(r))); if (!list.length) return ""; const w = list.reduce((a, b) => f(b) > f(a) ? b : a); return panel("nomc A", `<img src="${portrait(w.name)}" alt=""><div><div class="k">${k}</div><div class="n">${esc(w.name)}</div><div class="l">${lab}</div></div><div class="v num">${show(f(w))}</div>`, "a", `href="#${w.key}"`); };
  const b3 = `<div class="shead A"><h2>Игроки · ${S.rows.length}</h2><span class="r mono">рейтинг: 100 = среднее число попаданий в игре · среднее за игру</span></div>
  <div class="players">${panel("tbl A", `<div class="hd"><span class="mono">все игроки</span><div class="seg" data-pmin><button data-min="1">все</button><button data-min="3" aria-pressed="true">от 3 игр</button></div></div><div class="sc" style="--h:380px"><table id="ptable" class="sticky1"></table></div>`)}
  <div class="side3">${D ? panel("duel A", `<div class="mono">главная дуэль · ${D.meet} встреч</div><div class="pp"><div class="p"><img src="${portrait(D.a)}" alt=""><div class="n">${pLink(D.a, S)}</div></div><div class="big num">${D.ab}<i> : </i>${D.ba}</div><div class="p"><img src="${portrait(D.b)}" alt=""><div class="n">${pLink(D.b, S)}</div></div></div><div class="mono">${D.total} попаданий друг в друга за все игры</div>`) : ""}
  ${nomTile("Терминатор", "больше всех попаданий за игру", r => r.dealt / r.games, one)}${nomTile("Джон Уик", "лучший попал / получил", r => r.ratio, r2)}${nomTile("Белке в глаз", "лучшая точность", r => r.acc, pct)}${nomTile("Коллекционер MVP", "чаще всех MVP игры", r => r.mvps, String, r => r.mvps > 0)}</div></div>`;
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
let pmin = 3;
function homeInit(S) {
  const cols = [["name", "Игрок", r => r.name, null], ["games", "Игр", r => r.games, String], ["rating", "Рейтинг", r => r.mvp / r.games, ru, 1], ["dealt", "Попал", r => r.dealt / r.games, one, 1], ["recv", "Получил", r => r.recv / r.games, one], ["ratio", "Попал / получил", r => r.ratio, r2, 1], ["acc", "Точность", r => r.acc, pct, 1], ["deaths", "Смерти", r => r.deaths / r.games, one], ["alive", "Дожил до конца", r => r.rounds ? r.alive / r.rounds : NaN, pct, 1], ["mvps", "MVP игры", r => r.mvps, String]];
  const draw = () => { const rows = S.rows.filter(r => r.games >= pmin); const max = Object.fromEntries(cols.filter(c => c[4]).map(c => [c[0], Math.max(...rows.map(c[2]).filter(isFinite))]));
    sortable("ptable", cols, rows, r => `<tr class="${r.games < 3 ? "dim" : ""}"><td class="l"><a class="pl" href="#${r.key}">${esc(r.name)}</a></td>${cols.slice(1).map(c => `<td class="num">${c[4] && isFinite(c[2](r)) ? `<span class="bar" style="--w:${Math.round(c[2](r) / max[c[0]] * 48)}px"></span>` : ""}${isFinite(c[2](r)) || typeof c[2](r) === "string" ? c[3](c[2](r)) : "—"}</td>`).join("")}</tr>`, "rating"); };
  document.querySelectorAll("[data-pmin] button").forEach(b => b.onclick = () => { pmin = +b.dataset.min; document.querySelectorAll("[data-pmin] button").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  draw();
  const gcols = [["name", "Пушка", g => g.name, null], ["games", "Игр", g => g.games, String], ["players", "Игроков", g => g.players.length, String], ["dealtPG", "Попал", g => g.dealt / g.games, one], ["recvPG", "Получил", g => g.recv / g.games, one], ["ratio", "Попал / получил", g => g.ratio, r2], ["acc", "Точность", g => g.acc, pct], ["deathsPG", "Смерти", g => g.deaths / g.games, one], ["shotsPG", "Выстрелы", g => g.shots / g.games, fmt]];
  const gmax = Object.fromEntries(gcols.slice(1).map(([k, , f]) => [k, Math.max(1e-9, ...S.guns.map(f).filter(isFinite))]));
  sortable("gtable", gcols, S.guns, (g, key) => `<tr><td class="l"><a class="pl gn" href="#${g.key}">${gunArt(g) ? `<img src="${gunArt(g)}" alt="" loading="lazy">` : "<i></i>"}${esc(g.name)}<small>${genLabel(g)}</small></a></td>${gcols.slice(1).map(([k, , f, show]) => `<td class="num">${k === key && isFinite(f(g)) && k !== "games" && k !== "players" ? `<span class="bar" style="--w:${Math.round(f(g) / gmax[k] * 56)}px"></span>` : ""}${isFinite(f(g)) ? show(f(g)) : "—"}</td>`).join("")}</tr>`, "dealtPG");
  stripInit(document.getElementById("gstrip"));
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

// ---------- сортируемая таблица ----------
const cmpNum = (x, y, dir) => isFinite(x) !== isFinite(y) ? (isFinite(x) ? -1 : 1) : isFinite(x) ? dir * (x - y) : 0;
function sortable(id, cols, rows, rowHtml, initial) {
  let key = initial, dir = -1;
  const el = document.getElementById(id); if (!el) return;
  const draw = () => { const c = cols.find(x => x[0] === key);
    const sorted = [...rows].sort((a, b) => key === "name" ? dir * String(c[2](a)).localeCompare(String(c[2](b)), "ru") : cmpNum(c[2](a) ?? -1, c[2](b) ?? -1, dir));
    el.innerHTML = `<thead><tr>${cols.map(([k, label]) => `<th class="${k === "name" ? "l" : ""}" ${k === key ? `aria-sort="${dir < 0 ? "descending" : "ascending"}"` : ""}><button data-k="${k}">${label}</button></th>`).join("")}</tr></thead><tbody>${sorted.map(r => rowHtml(r, key)).join("")}</tbody>`; };
  el.onclick = e => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; if (k === key) dir = -dir; else { key = k; dir = k === "name" ? 1 : -1; } draw(); };
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
    return panel("team", `<div class="nm"><b>${TEAMS[t].name}</b><span class="mono">${mem.length} чел.${m.winners.length ? ` · раундов <b>${won}</b>` : ""}</span></div>
      <div class="roster">${mem.map(p => `${who(p)}${p.swap ? ` <small>(${when(p, t)})</small>` : ""}`).join(", ")}</div>
      <div class="kv"><div><div class="num">${A(eD)}${fmt(dealt)}</div><div class="lab">попал</div></div><div><div class="num">${A(eR)}${fmt(recv)}</div><div class="lab">получил</div></div><div><div class="num">${A(eD || eR)}${r2(div(dealt, recv))}</div><div class="lab">попал / получил</div></div><div><div class="num">${A(eK)}${deaths}</div><div class="lab">смертей</div></div><div><div class="num">${A(eS)}${fmt(shots)}</div><div class="lab">выстрелов</div></div><div><div class="num">${A(eD || eS)}${pct(div(dealt, shots))}</div><div class="lab">точность</div></div></div>
      ${tm ? `<div class="mvp"><div class="ring" style="--s:56px;--c:${tc(t)}"><img src="${portrait(tm.name)}" alt=""></div><div><div class="k">MVP команды</div><div class="n">${who(tm)}</div><div class="mono">рейтинг <b>${A(tm.e.mvp)}${fmt(m.mvpT(tm, t))}</b> · попал <b>${sum(P, v => valT(tm, v, t))}</b></div></div></div>` : ""}`, "div", `style="--c:${tc(t)}"`);
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
      return `<div class="dpart"><div class="dpart-h"><span class="dot" style="--c:${tc(t)}"></span><b>За ${TEAMS[t].name.toLowerCase().replace(/е$/, "х")}</b><span class="muted">${when(p, t)}</span><span class="dpart-s num">${gs} : ${ks} · ${coefS(gs, ks)}</span></div>${dhd}${drowsHtml(rows, maxPair)}</div>`; }).join("");
    return panel("dcard", `<div class="dhead"><div><div class="n">${who(p)}</div><div class="s">попал ${A(p.e.dealt)}${p.dealt} · получил ${A(p.e.recv)}${p.recv}</div></div><div class="ratio num">${A(p.e.ratio)}${r2(p.ratio)}<small>попал / получил</small></div></div><div class="drows" data-sortable>${body}</div>`);
  }).join("");
  // кто в кого
  const maxT = Math.max(1, ...g.hits.map(h => h[3]));
  const grids = teamIds.map(t => {
    const att = inTeam(t).sort((a, b) => sum(P, v => valT(b, v, t)) - sum(P, v => valT(a, v, t)));
    const vic = P.filter(p => p.teams.some(z => z !== t)).sort((a, b) => sum(P, k => valT(k, b, t)) - sum(P, k => valT(k, a, t)));
    return panel("tbl", `<div class="cap"><span class="dot" style="--c:${tc(t)}"></span> ${TEAMS[t].name} стреляют</div><div class="sc" style="--h:none"><table class="mx sticky1" style="--c:${tc(t)}"><thead><tr><th class="l">↓ кто → в кого</th>${vic.map(v => `<th>${esc(v.name)}</th>`).join("")}<th>Всего</th></tr></thead>
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
  ${pane("players", `<div class="sect"><div class="seg" data-gmode><button data-gmode="tot" aria-pressed="true">Всего</button><button data-gmode="rnd">За раунд</button></div>${panel("tbl", `<div class="sc" style="--h:none"><table id="gameTable" class="sticky1"></table></div><div class="ft">Рейтинг: 100 — среднее число попаданий на игрока в этой игре; 150 — в полтора раза больше среднего. Полоска «попал» окрашена цветом команды.</div>`)}</div>`)}
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
    cols.push(["mvp", "Рейтинг", p => p.mvp]);
    sortable("gameTable", cols, m.P, p => `<tr><td class="l">${pLink(p.name, S)}<small>${esc(p.gun !== p.name ? p.gun : "")}${p.swap ? " · смена команды" : ""}</small></td>
      <td class="num">${p.teams.map(t => { const n = sum(m.P, v => m.valT(p, v, t)); return `<span class="bar" style="--c:${tc(t)};--w:${Math.round(pr(p, n) / max * 80)}px;margin-right:${p.swap ? 1 : 8}px"></span>`; }).join("")}${A(p.e.dealt)}${nf(pr(p, p.dealt), fmt)}</td>
      <td class="num">${A(p.e.recv)}${nf(pr(p, p.recv), fmt)}</td><td class="num">${A(p.e.ratio)}${r2(p.ratio)}</td><td class="num">${A(p.e.deaths)}${nf(pr(p, p.deaths), fmt)}</td><td class="num">${pd(div(p.dealt, p.deaths))}</td><td class="num">${A(p.e.shots)}${R ? one(pr(p, p.shots)) : fmt(p.shots)}</td><td class="num">${A(p.e.acc)}${pct(p.acc)}</td>${m.winners.length ? `<td class="num">${p.alive ?? "—"}${p.nR ? ` <span class="muted">/ ${p.nR}</span>` : ""}</td>` : ""}<td class="num"><b>${A(p.e.mvp)}${fmt(p.mvp)}</b></td></tr>`, "mvp");
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
  ${panel("phero", `<div class="bgimg" style="--img:url(art/c-map.webp)"></div><div><div class="eyebrow">Игрок${rank ? ` · № ${rank} в рейтинге` : " · меньше 3 игр"}</div><h1>${esc(s.name)}</h1>
    <div class="facts"><div class="fact"><span class="v">${s.games}</span><span class="k">${plural(s.games, ["игра", "игры", "игр"]).split(" ")[1]}</span></div><div class="fact"><span class="v">${ru(s.mvp / s.games)}</span><span class="k">рейтинг</span></div><div class="fact"><span class="v">${fmt(s.dealt)}</span><span class="k">попаданий</span></div><div class="fact"><span class="v">${r2(s.ratio)}</span><span class="k">попал / получил</span></div><div class="fact"><span class="v">${pct(s.acc)}</span><span class="k">точность</span></div><div class="fact"><span class="v">${s.mvps}</span><span class="k">MVP игры</span></div>${s.rounds ? `<div class="fact"><span class="v">${pct(s.alive / s.rounds)}</span><span class="k">дожил до конца раунда</span></div>` : ""}</div></div>
    <div class="fig"><img src="${figure(s.name)}" alt=""></div>`)}
  <div class="noms">${tg ? panel("nomc", `<img src="${portrait(tg[0])}" alt=""><div><div class="k">Груша для битья</div><div class="n">${pLink(tg[0], S)}</div><div class="l">в кого попадал чаще всего</div></div><div class="v num">${tg[1]}</div>`) : ""}${nm ? panel("nomc", `<img src="${portrait(nm[0])}" alt=""><div><div class="k">Личный кошмар</div><div class="n">${pLink(nm[0], S)}</div><div class="l">кто чаще всего попадал в него</div></div><div class="v num">${nm[1]}</div>`) : ""}${best ? panel("nomc", `<div style="width:44px;height:44px;border-radius:50%;background:var(--uvd);display:grid;place-items:center;font-family:var(--mono);font-size:10px;color:var(--uv2)">${dDay(best.g.date).day}<br>${dDay(best.g.date).mon}</div><div><div class="k">Лучшая игра</div><div class="n"><a class="pl" href="#${best.key}">${dateShort(best.g.date)}</a></div><div class="l">больше всего попаданий за игру</div></div><div class="v num">${best.p.dealt}</div>`) : ""}</div>
  ${ptabs([["games", "По играм"], ["prog", "Прогресс"], ["duels", "Дуэли"], ["guns", "Пушки"]])}
  ${pane("games", panel("tbl", `<div class="sc" style="--h:none"><table class="sticky1"><thead><tr><th class="l">Игра</th><th class="l">Команда</th><th>Попал</th><th>Получил</th><th>Попал / получил</th><th>Смерти</th><th>Выстрелы</th><th>Точность</th><th>Рейтинг</th></tr></thead>
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
const RANK = h => /^s[1-4]$/.test(h) || h === "home" ? 0 : h === "games" ? 1 : 2;
let lastRoute = null;
function render() {
  const h = (location.hash || "#s1").slice(1), prev = lastRoute; lastRoute = h;
  const pageChange = prev !== null && (RANK(prev) !== RANK(h) || (RANK(h) === 2 && prev !== h));
  if (pageChange && document.startViewTransition && !matchMedia("(prefers-reduced-motion:reduce)").matches) {
    document.documentElement.dataset.dir = RANK(h) >= RANK(prev) ? "fwd" : "back";
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
    return;
  }
  homeShown = false; main.classList.remove("snap");
  let html, after = () => {}, back = "#s1", label = "";
  if (h === "games") { html = viewGames(S); after = gamesInit; back = "#s2"; label = "Игры"; }
  else if (h.startsWith("game-")) { html = viewGame(S, h); after = () => gameInit(S, h); back = "#s2"; label = "Игры"; }
  else if (/^p\d+$/.test(h)) { html = viewPlayer(S, h); after = () => playerInit(S, h); back = "#s3"; label = "Игроки"; }
  else if (/^gun\d+$/.test(h)) { html = viewGun(S, h); after = () => gunInit(S, h); back = "#s4"; label = "Пушки"; }
  else { location.hash = "#s1"; return; }
  app.innerHTML = `<div class="wrap">${html}</div>`; after(); main.scrollTo(0, 0);
  crumb(`<a href="${back}">← ${label}</a>`);
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
