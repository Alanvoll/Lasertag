// Оболочка, Сезон, Игры, Игра (4 вкладки), Повтор.
"use strict";
let ME = null; try { ME = localStorage.getItem("lt-me") || null; } catch (_) {}
const ST = {
  gFilter: "all", gMode: "tot", gSort: { k: "mvp", dir: -1 }, gExp: null, gFrags: false, gHelp: false,
  dPick: {}, dSort: { k: "tot", dir: -1 }, mxSwap: false, aPick: {}, noteOpen: false,
  sNom: "avg", sNomAll: false, pairs: "pairs", pairsAll: false, pairsWho: null,
  plMode: "avg", plCls: "all", plLoc: "all", plMin: 1, plSort: { k: "rating", dir: -1 }, plMore: false, plHelp: false,
  cmpA: null, cmpB: null, sheet: null, meOpen: false,
  pg: { metric: "mvp", view: "chart" }, awPick: 0, pdSort: { k: "tot", dir: -1 },
  gunMode: "tot", gunCls: "all", gunSort: { k: "dealt", dir: -1 }, gpSort: { k: "dealt", dir: -1 },
  spMode: "q", spNorm: "rd", spHide1: true,
};
try { const v = JSON.parse(localStorage.getItem("spread") || "{}"); if (["k", "r", "q", "kx", "rx"].includes(v.m)) ST.spMode = v.m; if (v.n === "g" || v.n === "rd") ST.spNorm = v.n; if (typeof v.h === "boolean") ST.spHide1 = v.h; } catch (_) {}

const sortBy = (rows, f, dir, nameF = r => String(r.name ?? r.n ?? "")) => [...rows].sort((a, b) => { const x = f(a), y = f(b); if (typeof x === "string") return dir * x.localeCompare(y, "ru"); const xa = isFinite(x) ? x : x > 0 ? 1e12 : -1e12, ya = isFinite(y) ? y : y > 0 ? 1e12 : -1e12; return dir * (xa - ya) || nameF(a).localeCompare(nameF(b), "ru"); });

// ---------- оболочка ----------
function navBar(active) {
  const me = ME && BYNAME.get(ME);
  const it = (k, l) => `<a class="mi${active === k ? " on" : ""}" href="#${k}" ${active === k ? 'aria-current="page"' : ""}>${NAVIC[k]}<span>${l}</span></a>`;
  return `<header class="nav"><a class="logo" href="#season">${LOGO}<span>Лазертаг</span><span class="O st" style="font-size:11px;margin-left:6px">сезон 2026</span></a>
   ${it("season", "Сезон")}${it("games", "Игры")}${it("players", "Игроки")}${it("guns", "Пушки")}<div style="flex:1"></div>
   <span class="O st" style="font-size:11px;margin-right:18px">${plural(DATA.games.length, ["игра", "игры", "игр"])} · ${fmt(sum(S.models, m => m.winners.length))} раундов</span>
   <div class="me"><button class="meb" data-a="meMenu" aria-expanded="${ST.meOpen}">${me ? pt(me.name, 34) : `<span class="pt" style="width:34px;height:34px"><span class="ini" style="font-size:18px">?</span></span>`}<span>${me ? "я · " + esc(me.name) : "я · выбрать"}</span><span class="st">▾</span></button>
   ${ST.meOpen ? `<div class="menu">${me ? `<a href="${plHref(me.name)}" data-a="meClose">Мой профиль</a><button data-a="meSet" data-v="">Сбросить «я»</button>` : ""}${[...S.rows].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name, "ru")).map(r => `<button data-a="meSet" data-v="${esc(r.name)}">${pt(r.name, 30)}<span class="grow">${esc(r.name)}</span><span class="st xs">${plural(r.games, ["игра", "игры", "игр"])}</span></button>`).join("")}</div>` : ""}</div></header>`;
}
function tabBar(active) {
  const it = (k, l) => `<a class="${active === k ? "on" : ""}" href="#${k}" ${active === k ? 'aria-current="page"' : ""}>${NAVIC[k]}<span>${l}</span></a>`;
  return `<nav class="tb" aria-label="Разделы">${it("season", "Сезон")}${it("games", "Игры")}${it("players", "Игроки")}${it("guns", "Пушки")}</nav>`;
}
const ptopLogo = right => `<div class="ptop"><a class="logo" href="#season">${LOGO}<span>Лазертаг</span></a>${right || ""}</div>`;
const ptopBack = (href, crumbs, right) => `<div class="ptop"><a class="back" href="${href}" aria-label="Назад" data-a="back" data-v="${href}">${BACK}</a><div class="crumb grow">${crumbs}</div>${right || `<a href="#season" aria-label="На главную" class="fx" style="min-height:44px;min-width:44px;justify-content:center">${LOGO}</a>`}</div>`;
const isMe = name => ME && ME === name;

// ---------- СЕЗОН ----------
function pageSeason() {
  const rounds = sum(S.models, m => m.winners.length), hits = sum(S.models, m => sum(m.P, p => p.dealt)), shots = sum(S.models, m => sum(m.P, p => p.shots));
  const wins = {}; GL.forEach(x => { if (x.win != null) wins[x.win] = (wins[x.win] || 0) + 1; });
  const wl = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  const byR = GL.filter(x => x.sc.kind === "раунды");
  const rT = {}; byR.forEach(x => x.sc.parts.forEach(([t, n]) => rT[t === x.win ? "w" : "l"] = (rT[t === x.win ? "w" : "l"] || 0) + n));
  const kick = wl.length ? `${tname(+wl[0][0])} ${wl[0][1]} : ${GL.length - wl[0][1]} по играм` : "";
  const top3 = MAIN.slice(0, 3);
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const card = (r, big) => `<a class="podc${big ? " big" : ""}" href="${plHref(r.name)}"><div class="A pnm"><span class="rk">#${r.rank}</span> ${esc(r.name)}</div><div class="O pr">рейтинг <b class="A">${fmt(r.rating)}</b></div><div class="small mu">${plural(r.games, ["игра", "игры", "игр"])} · ${r.mvps} MVP</div><div class="xs mu dt">попал ${onePt(r.dealt / r.games)} · коэф. ${r2(r.ratioPerGame)}</div></a>`;
  const hero = `<section class="hero">${ptopLogo(`<span class="O st xs">сезон 2026</span>`)}
    <div class="ghost ph" style="right:-20px;top:40px;font-size:150px">2026</div>${`<div class="ghost dt" style="left:36%;top:40px">Лидеры</div>`}
    
    <div class="hin seasonhero"><div class="sh-l">
      <div class="kick u"><span class="tag sh"><span>Сезон 2026</span></span><span>главная · ${esc(kick)}${byR.length ? ` · ${rT.w || 0} : ${rT.l || 0} по раундам` : ""}</span></div>
      <div class="A title il">Сезон</div>
      <div class="facts u d2"><div class="fact"><div class="v">${DATA.games.length}</div><div class="k">игр</div></div><div class="fact"><div class="v">${fmt(rounds)}</div><div class="k">раундов</div></div><div class="fact"><div class="v">${fmt(hits)}</div><div class="k">попаданий</div></div><div class="fact"><div class="v">${pct(div(hits, shots))}</div><div class="k">точность</div></div></div></div>
      <div class="podium">${podium.map((r, i) => `<div class="podcol${r === top3[0] ? " first" : ""}"><div class="podart">${fig(r.name, `animation-delay:${.1 + i * .15}s`)}</div>${card(r, r === top3[0])}</div>`).join("")}</div>
    </div><p class="note hin" style="padding-top:0;padding-bottom:12px;margin:0">Лидеры: средний рейтинг MVP за игру среди игроков от ${MIN} игр (100 = средний игрок игры).</p></section>`;

  // игры сезона
  const gamesList = `<div class="ph hscroll"><div class="fx" style="gap:8px;align-items:stretch">${GL.map(x => gameCardMini(x)).join("")}</div></div>
    <div class="dt">${GL.map(x => gameRowSmall(x)).join("")}</div>`;
  // рекорды за одну игру
  const per = S.models.flatMap(m => m.P.map(p => ({ p, m })));
  const recs = [];
  const byD = [...per].sort((a, b) => b.p.dealt - a.p.dealt);
  const recRow = (ic, lab, r, v, sub = "") => r ? `<a class="recr" href="${plHref(r.p.name)}">${icon(ic)}<span class="O xs mu grow ell">${lab}</span>${pt(r.p.name, 26)}<b class="ell" style="max-width:110px">${esc(r.p.name)}</b><span class="xs st nowrap">${dd(r.m.g.date)}${sub}</span><span class="N" style="font-size:18px;min-width:56px;text-align:right">${v}</span></a>` : "";
  const best = f => per.filter(z => isFinite(f(z.p)) && !(z.p.e && (z.p.e.mvp))).reduce((a, b) => f(b.p) > f(a.p) ? b : a, per[0]);
  const bAcc = per.filter(z => z.p.shots && !z.p.e.acc).reduce((a, b) => b.p.acc > a.p.acc ? b : a);
  const bR = per.filter(z => isFinite(z.p.ratio) && !z.p.e.ratio).reduce((a, b) => b.p.ratio > a.p.ratio ? b : a);
  recs.push(recRow("bolt", "Больше всех попаданий", byD[0], approx(byD[0].p.e.dealt) + byD[0].p.dealt), recRow("bolt", "Попаданий, 2-е", byD[1], approx(byD[1].p.e.dealt) + byD[1].p.dealt),
    recRow("crown", "Лучший рейтинг", best(p => p.mvp), fmt(best(p => p.mvp).p.mvp)), recRow("swap", "Лучший коэф.", bR, r2(bR.p.ratio), ` · ${bR.p.dealt}:${bR.p.recv}`), recRow("target", "Лучшая точность", bAcc, pct(bAcc.p.acc), clsOf(bAcc.p) === "pistol" ? " · пистолет" : ""));
  const records = `<div class="pn recs">${sec(0, "Рекорды сезона", "", `<span class="O xs st">за одну игру</span>`)}${recs.join("")}</div>`;
  // номинации
  const nomAvg = SEASON_NOM_LIST, nomRec = nomData(per.map(({ p, m }) => ({ ...p, rounds: p.nR, date: m.g.date })), REC_NOMS);
  const list = ST.sNom === "avg" ? nomAvg : nomRec;
  const mvpN = list[0];
  const nomRowsAll = list.slice(1), nomRows = ST.sNomAll ? nomRowsAll : nomRowsAll.slice(0, 5);
  const whoN = (n, rec) => n.w.map(r => `<a href="${plHref(r.name)}" class="wh">${esc(r.name)}</a>${rec ? `<span class="st xs"> ${dd(r.date)}</span>` : ""}`).join(", ");
  const noms = `${sec(2, "Номинации сезона", "", seg(ST.sNom, "sNom", [["avg", "Среднее"], ["rec", "Рекорд"]], "sm"))}
    <div class="pn nomsea">${mvpN ? `<div class="fx gap14 nomtop">${pt(mvpN.w[0].name, 64)}<div class="grow"><div class="fx gap10"><span class="tag"><span>${ST.sNom === "avg" ? "MVP сезона" : "MVP · рекорд"}</span></span><span class="O xs st">${ST.sNom === "avg" ? "средний рейтинг за игру" : "лучший рейтинг за одну игру"}</span></div><div class="fx gap14" style="margin-top:6px"><a class="A" style="font-size:40px" href="${plHref(mvpN.w[0].name)}">${esc(mvpN.w.map(r => r.name).join(", "))}</a><span class="A" style="font-size:40px">${mvpN.v}</span>${ST.sNom === "rec" ? `<span class="st xs">${mvpN.w.map(r => dd(r.date)).join(", ")}</span>` : ""}</div></div></div>` : ""}
    ${nomRows.map(n => `<div class="nrow">${icon(n.icon)}<span class="O xs mu nt">${n.title}</span><span class="grow small">${whoN(n, ST.sNom === "rec")}<span class="st xs dt"> · ${esc(n.label)}</span></span><span class="N" style="font-size:18px">${n.v}</span></div>`).join("")}
    ${nomRowsAll.length > 5 ? `<button class="more" data-a="sNomAll">${ST.sNomAll ? "Свернуть ▲" : `Все номинации · ${nomRowsAll.length} ▼`}</button>` : ""}
    <p class="note">${ST.sNom === "avg" ? `В среднем за игру, среди игроков от ${MIN} игр. «Последний герой» — доля раундов, где дожил до конца.` : "Лучший результат за одну игру среди всех игроков сезона, рядом дата."}</p></div>`;
  // раунды по играм
  const rb = duoBars([...GL].reverse().map(x => { const r = x.sc.kind === "раунды"; const pa = x.m.winners.filter(w => w === x.ta).length, pb = x.m.winners.filter(w => w === x.tb).length;
    return { lab: dd(x.date), a: pa, b: pb, ca: tc(x.ta), cb: tc(x.tb), href: "#" + x.key, hatch: !r, note: r ? "" : "*", tip: `${dd(x.date)}: ${tname(x.ta)} ${pa} : ${pb} ${tname(x.tb)}${r ? "" : " (засчитано по попаданиям)"}` }; }));
  const roundsChart = `<div class="pn">${sec(0, "Раунды по играм")}${rb}<p class="note">Вверх — раунды победителя игры, вниз — соперника. ${GL.some(x => x.sc.kind !== "раунды") ? "* засчитано по попаданиям, столбик — раунды." : ""}</p></div>`;
  // дуэли
  const tp = PAIRS[0];
  const duel = tp ? `${sec(3, "Главная дуэль", `<button class="lk" data-a="pairsAll">${ST.pairsAll ? "Свернуть" : "Все пары ›"}</button>`)}
    ${vsBanner(tp.a.name, tp.b.name, tp.x, tp.y, false)}
    <div class="vsb" style="height:8px;margin-top:6px"><i style="flex:${tp.x};--c:var(--P1)"></i><i style="flex:${tp.y};--c:var(--P2)"></i></div>
    <div class="O xs mu c" style="margin-top:8px">${tp.n} попаданий друг в друга · ${plural(tp.g, ["игра", "игры", "игр"])}</div>
    <div class="pn" style="margin-top:16px">${pairsBlock()}</div>` : "";
  return `${hero}<div class="below">
    <div class="grid3">
      <div class="col"><div>${sec(1, "Игры сезона", `<a class="lk" href="#games">Все ${GL.length} ›</a>`)}${gamesList}</div><div class="dt">${records}</div></div>
      <div class="col"><div>${noms}</div><div class="dt">${roundsChart}</div></div>
      <div class="col"><div>${duel}</div><div class="ph">${records}</div><div class="ph">${roundsChart}</div></div>
    </div></div>`;
}
function pairsBlock() {
  const head = `<div class="fxb" style="margin-bottom:8px"><span class="cap">Главные противостояния</span>${seg(ST.pairs, "pairs", [["pairs", "Пары"], ["players", "По игрокам"]], "sm")}</div>`;
  if (ST.pairs === "pairs") {
    const list = ST.pairsAll ? PAIRS : PAIRS.slice(0, 6), mx = PAIRS[0] ? PAIRS[0].n : 1;
    return head + list.map(z => `<div class="prow"><a href="${plHref(z.a.name)}" class="fx gap6 pa">${pt(z.a.name, 28)}<span class="ell">${esc(z.a.name)}</span></a><span class="N">${z.x}</span><span class="ptr">${vsbar(z.x, z.y, "var(--P1)", "var(--P2)")}<i class="ptw" style="width:${(z.n / mx * 100).toFixed(0)}%"></i></span><span class="N st">${z.y}</span><a href="${plHref(z.b.name)}" class="fx gap6 pb"><span class="ell">${esc(z.b.name)}</span>${pt(z.b.name, 28)}</a></div>`).join("")
      + (PAIRS.length > 6 ? `<button class="more" data-a="pairsAll">${ST.pairsAll ? "Свернуть ▲" : `Все пары · ${PAIRS.length} ▼`}</button>` : "")
      + `<p class="note">Сумма попаданий друг в друга за все игры. Слева — сколько первый попал во второго.</p>`;
  }
  const who = ST.pairsWho && BYNAME.get(ST.pairsWho) || MAIN[0];
  const rows = sortBy(seasonFoes(who), r => r.gave + r.took, -1);
  return head + `<div class="pstrip">${[...S.rows].sort((a, b) => b.games - a.games || b.rating - a.rating).map(r => `<button class="${r === who ? "on" : ""}" data-a="pairsWho" data-v="${esc(r.name)}">${pt(r.name, 50)}<span class="ell" style="max-width:60px">${esc(r.name)}</span></button>`).join("")}</div>
    <div class="fxb" style="margin:10px 0 4px"><a class="A" style="font-size:28px" href="${plHref(who.name)}">${esc(who.name)} <span class="st" style="font-size:20px">vs</span></a><span class="N">${who.dealt} : ${who.recv}</span></div>
    ${duelList(rows.map(r => ({ name: r.n, gave: r.gave, took: r.took })), "var(--P1)", "var(--P2)", null)}`;
}
function vsBanner(a, b, x, y, pick) {
  return `<div class="vsban"><${pick ? 'button data-a="sheet" data-v="A"' : `a href="${plHref(a)}"`} class="side a">${fig(a, "animation-delay:.1s")}${pick ? `<span class="pick">сменить ▾</span>` : ""}<span class="nmv">${esc(a)}${x != null ? ` <span class="N">${x}</span>` : ""}</span></${pick ? "button" : "a"}>
    <${pick ? 'button data-a="sheet" data-v="B"' : `a href="${plHref(b)}"`} class="side b">${fig(b, "transform:translateX(-50%) scaleX(-1);animation-delay:.25s")}${pick ? `<span class="pick">сменить ▾</span>` : ""}<span class="nmv">${y != null ? `<span class="N">${y}</span> ` : ""}${esc(b)}</span></${pick ? "button" : "a"}>
    <div class="vsd"><span>VS</span></div></div>`;
}
function gameCardMini(x) {
  const m = x.m, mv = m.mvp;
  return `<a class="gmini" href="#${x.key}"><div class="fxb"><span class="A" style="font-size:32px">${dd(x.date)}</span><span class="score A" style="font-size:36px">${scoreHtml(x)}</span></div>
    <div class="fxb xs mu"><span>${m.winners.length ? m.winners.length + " р. · " : ""}${m.P.length} игроков</span><span class="O">${x.sc.kind}</span></div>
    <div class="fx gap6 small" style="margin:6px 0">${tmk(x.ta)}<span class="st">vs</span>${tmk(x.tb)}<span>${tname(x.tb)}</span></div>${rib(x)}
    <div class="fx gap10" style="margin-top:8px">${pt(mv.name, 34)}<span class="O xs">MVP</span><span class="grow">${esc(mv.name)}</span><b class="N">${fmt(mv.mvp)}</b></div></a>`;
}
function gameRowSmall(x) {
  const mv = x.m.mvp;
  return `<a class="grs" href="#${x.key}">${pt(mv.name, 48)}<div style="width:70px"><div class="A" style="font-size:26px">${dd(x.date)}</div><div class="O xs mu">MVP ${fmt(mv.mvp)}</div></div><div class="grow"><div class="fx gap6 xs mu">${tmk(x.ta, 1)}<span>vs</span>${tmk(x.tb, 1)}<span>${x.m.winners.length ? x.m.winners.length + " р. · " : ""}${x.m.P.length} игроков</span>${x.replay ? icon("play", "ico") : ""}</div><div style="margin-top:6px">${rib(x)}</div></div><div class="r"><div class="A" style="font-size:32px">${scoreHtml(x)}</div><div class="O xs mu">${x.sc.kind}</div></div><span class="chev">›</span></a>`;
}
const scoreHtml = x => { const pa = x.sc.parts.find(p => p[0] === x.ta), pb = x.sc.parts.find(p => p[0] === x.tb); return `<span style="color:${tc(x.ta)}">${pa ? pa[1] : 0}</span><i>:</i><span style="color:${tc(x.tb)}">${pb ? pb[1] : 0}</span>`; };
const rib = (x, big) => x.m.winners.length ? `<div class="rib"${big ? ' style="gap:3px"' : ""}>${x.m.winners.map((w, i) => (x.m.swaps.includes(i) ? "<b></b>" : "") + (w === null ? `<i class="u" title="Раунд ${i + 1}: не записан"></i>` : `<i style="--c:${tc(w)};animation-delay:${(i * .015).toFixed(3)}s" title="Раунд ${i + 1}: ${tname(w)}"></i>`)).join("")}</div>` : `<div class="xs st">раунды не определены</div>`;

// ---------- ИГРЫ ----------
const GF = { all: ["Все", () => true], replay: ["С повтором", x => x.replay], rounds: ["По раундам", x => x.sc.kind === "раунды"], hits: ["По попаданиям", x => x.sc.kind !== "раунды"] };
function pageGames() {
  const wins = {}; GL.forEach(x => { if (x.win != null) wins[x.win] = (wins[x.win] || 0) + 1; });
  const wl = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];
  const byR = GL.filter(x => x.sc.kind === "раунды"); let rw = 0, rl = 0; byR.forEach(x => x.sc.parts.forEach(([t, n]) => t === x.win ? rw += n : rl += n));
  const rounds = sum(S.models, m => m.winners.length);
  const list = GL.filter(GF[ST.gFilter][1]);
  const filters = `<div class="chips">${Object.entries(GF).map(([k, [l, f]]) => { const n = GL.filter(f).length; return n || k === "all" ? chip(ST.gFilter === k, "gFilter", k, `${l} · ${n}`) : ""; }).join("")}</div>`;
  const row = x => { const m = x.m, mv = m.mvp;
    return `<a class="grow2 u" href="#${x.key}"><div class="gmv"><div class="artb dt">${fig(mv.name)}</div><span class="ph">${pt(mv.name, 56)}</span><span class="mlab ph">MVP</span></div>
      <div class="gdt"><div class="A dt1">${dd(x.date)}</div><span class="tag"><span>${x.win != null ? "Победа " + tgen(x.win) : "Ничья"}</span></span></div>
      <div class="gmid"><div class="fx gap6 O xs">${tmk(x.ta)}<span>${tname(x.ta)}</span><span class="st">vs</span>${tmk(x.tb)}<span>${tname(x.tb)}</span>${x.replay ? `<span class="beta">повтор</span>` : ""}</div>
        <div style="margin:7px 0">${rib(x)}</div><div class="meta">${m.winners.length ? m.winners.length + " раундов · " : ""}${m.P.length} игроков · MVP <b>${esc(mv.name)} ${fmt(mv.mvp)}</b></div>
        ${x.sc.kind !== "раунды" && m.winners.length ? `<div class="xs st">раунды ${m.winners.filter(w => w === x.ta).length} : ${m.winners.filter(w => w === x.tb).length}, записано ${m.winners.filter(w => w !== null).length}</div>` : x.sc.kind === "раунды" ? `<div class="xs st">попадания ${x.hits.map(([t, n]) => n).join(" : ")}${m.winners.some(w => w === null) ? ` · ${m.winners.map((w, i) => w === null ? i + 1 : 0).filter(Boolean).join(", ")}-й не записан` : ""}</div>` : ""}</div>
      <div class="gfl dt">${sparkFlow(m, x.ta, x.tb)}<div class="O xs st">ход игры</div></div>
      <div class="gsc r"><div class="score">${scoreHtml(x)}</div><div class="O xs mu">${x.sc.kind}</div></div><span class="chev">›</span></a>`; };
  const items = [...GL].reverse();
  const rb = duoBars(items.map(x => ({ lab: dd(x.date), a: x.m.winners.filter(w => w === x.ta).length, b: x.m.winners.filter(w => w === x.tb).length, ca: tc(x.ta), cb: tc(x.tb), href: "#" + x.key, hatch: x.sc.kind !== "раунды", tip: dd(x.date) })));
  const mvpC = {}; GL.forEach(x => mvpC[x.m.mvp.name] = (mvpC[x.m.mvp.name] || 0) + 1);
  const mvpL = Object.entries(mvpC).sort((a, b) => b[1] - a[1]);
  return `<section class="hero">${ptopLogo(`<span class="O xs st">${plural(GL.length, ["игра", "игры", "игр"])} сезона</span>`)}
    <div class="ghost ph" style="right:-10px;top:30px;font-size:170px">${String(GL.length).padStart(2, "0")}</div><div class="ghost dt" style="left:40%;top:40px">История</div>
    <div class="hin gameshero"><div><div class="kick u"><span class="tag"><span>Игры</span></span><span>история матчей · последняя первой</span></div>
      <div class="A title il">Матчи</div>
      <div class="ph small" style="margin-top:8px">${wl ? `${tmk(+wl[0])} <b>${tname(+wl[0])} ${wl[1]} : ${GL.length - wl[1]}</b> <span class="mu">· ${rw} : ${rl} по раундам в ${byR.length} играх</span>` : ""}</div></div>
      <div class="dt"><div class="facts" style="min-width:620px">${wl ? `<div class="fact"><div class="v">${wl[1]}:${GL.length - wl[1]}</div><div class="k">${tname(+wl[0]).toLowerCase()} по играм</div></div>` : ""}<div class="fact"><div class="v">${rw}:${rl}</div><div class="k">раунды в ${byR.length} играх</div></div><div class="fact"><div class="v">${rounds}</div><div class="k">раундов</div></div><div class="fact"><div class="v">${DATA.replays.length}</div><div class="k">повтор боя · бета</div></div></div></div>
    </div></section>
    <div class="below"><div class="gridm"><div class="col"><div>${filters}<div class="legend" style="margin:12px 0 8px"><span><i style="--c:var(--R)"></i>победитель раунда</span><span><i style="--c:#555;background:repeating-linear-gradient(45deg,#6a6a6a 0 2px,transparent 2px 4px)"></i>не записан</span><span class="st">строка → страница игры</span></div>
      ${list.length ? list.map(row).join("") : `<div class="empty">Таких игр нет</div>`}</div></div>
      <div class="col"><div class="pn">${sec(1, "Раунды по играм")}${rb}<p class="note">Вверх — победитель игры, вниз — соперник. Столбик ведёт на игру.</p></div>
      <div class="pn">${sec(2, "MVP по играм")}${mvpL.map(([n, c]) => `<a class="fx gap10" style="min-height:44px" href="${plHref(n)}">${pt(n, 32)}<span style="width:110px" class="ell">${esc(n)}</span><span class="fx grow" style="gap:4px">${Array.from({ length: c }, () => `<i style="width:22px;height:12px;background:#fff;display:block"></i>`).join("")}</span><b class="N">${c}</b></a>`).join("")}</div>
      <div class="pn">${sec(3, "Игроков в игре")}${vbars(items.map(x => ({ lab: dd(x.date), v: x.m.P.length, href: "#" + x.key })), 360, 140)}</div></div></div></div>`;
}

// ---------- ИГРА ----------
function gameHead(x, tab) {
  const m = x.m, idx = GL.indexOf(x), newer = GL[idx - 1], older = GL[idx + 1];
  const tabN = { sum: "Сводка", players: "Игроки", duels: "Дуэли", awards: "Награды" }[tab];
  const est = m.P.some(p => p.est.size || p.e.dealt);
  const estTeam = est ? [...new Set(m.P.filter(p => p.est.size || p.e.dealt).map(p => mainTeam(m, p)))] : [];
  const meta = `${m.winners.length ? m.winners.length + " раундов · " : ""}${m.P.length} игроков · попадания ${x.hits.map(([, n]) => n).join(" : ")}`;
  const base = "#" + x.key;
  const sfx = tab === "sum" ? "" : "-" + tab;
  const nav = `<div class="gnav">${older ? `<a href="#${older.key}${sfx}" title="Предыдущая игра">‹ ${dd(older.date)}</a>` : `<span>‹</span>`}${newer ? `<a href="#${newer.key}${sfx}" title="Следующая игра">${dd(newer.date)} ›</a>` : `<span>›</span>`}</div>`;
  const tagW = `<span class="tag sh"><span>${x.win != null ? "Победа " + tgen(x.win) : "Ничья"}</span></span>`;
  return `<section class="hero gh">${ptopBack("#games", `<a href="#games">Игры</a><span class="sep">›</span><span>${dd(x.date)}</span>`)}
    <div class="ghost dt" style="left:37%;top:40px">${x.win != null ? "Победа" : "Игра"}</div>
    <div class="hin">
      <div class="dt fx gap10 crumb" style="margin-bottom:10px"><a class="back" href="#games" data-a="back" data-v="#games" aria-label="Назад">${BACK}</a><a href="#games">Игры</a><span class="sep">›</span><span>${dd(x.date)}</span><span class="sep">›</span><span>${tabN}</span>${tagW}<span>${meta} · игра ${x.num} из ${GL.length}</span><span class="grow"></span>${nav}</div>
      <div class="ph"><div class="fxb" style="align-items:flex-start;gap:8px"><div class="grow" style="padding-top:6px"><div class="fx gap10">${tagW}<span class="O xs">${dd(x.date)}</span></div>
        <div class="O xs" style="margin-top:8px;letter-spacing:.08em">${meta}</div><div class="fx gap6 O xs" style="margin-top:8px">${tmk(x.ta)}<span>${tname(x.ta)}</span><span class="st">vs</span>${tmk(x.tb)}<span>${tname(x.tb)}</span></div></div>
        <div class="scoreb A il">${scoreHtml(x).replace("<i>:</i>", "<i>:</i>")}</div></div>
        <div style="margin-top:10px">${rib(x, 1)}</div><div class="fxb" style="margin-top:10px">${nav}${x.replay ? `<a class="repl" href="#replay-${x.date}">${icon("play")}Повтор <span class="beta">бета</span></a>` : ""}</div></div>
      <div class="dt ghrow"><div class="fx gap14"><div class="fx gap6 O small">${tmk(x.ta)}${tname(x.ta)}</div><div class="scoreb A il">${scoreHtml(x)}</div><div class="fx gap6 O small">${tmk(x.tb)}${tname(x.tb)}</div></div>
        <div class="grow" style="max-width:900px;margin-left:auto"><div class="fxb O xs" style="margin-bottom:8px"><span>${m.winners.length ? `раунды 1–${m.winners.length}` : x.sc.kind}</span><span>${m.winners.some(w => w === null) ? m.winners.map((w, i) => w === null ? i + 1 : 0).filter(Boolean).join(", ") + "-й не записан" : x.sc.kind === "раунды" ? "" : "засчитано по попаданиям"}</span></div>${rib(x, 1)}</div></div>
    </div></section>
    <nav class="tabs" aria-label="Вкладки игры">${[["sum", "Сводка", ""], ["players", "Игроки", "-players"], ["duels", "Дуэли", "-duels"], ["awards", "Награды", "-awards"]].map(([k, l, s]) => `<a href="${base}${s}" class="${tab === k ? "on" : ""}" ${tab === k ? 'aria-current="page"' : ""}>${l}</a>`).join("")}
    <span class="tnote">${est ? `≈ у ${estTeam.map(tgen).join(" и ")} часть данных — оценка` : ""}${x.replay ? `<a class="repl" href="#replay-${x.date}">${icon("play")}Повтор боя <span class="beta">бета</span></a>` : ""}</span></nav>`;
}
function pageGame(key, tab) {
  const x = gameByKey(key); if (!x) return pageGames();
  const body = tab === "players" ? gamePlayers(x) : tab === "duels" ? gameDuels(x) : tab === "awards" ? gameAwards(x) : gameSummary(x);
  return gameHead(x, tab) + `<div class="below">${body}</div>`;
}
const teamOrder = (x, list) => { const by = t => list.filter(p => mainTeam(x.m, p) === t); return [[x.ta, by(x.ta)], [x.tb, by(x.tb)], ...x.m.teamIds.filter(t => t !== x.ta && t !== x.tb).map(t => [t, by(t)])].filter(([, l]) => l.length); };
const A_ = approx;
function gameSummary(x) {
  const m = x.m, mv = m.mvp, mt = mainTeam(m, mv);
  const groups = teamOrder(x, [...m.P].sort((a, b) => b.mvp - a.mvp));
  const lineupPh = `<div class="fxb cap" style="margin-bottom:6px"><span>Составы · рейтинг</span><span>100 = средний</span></div><div class="lineup">${groups.map(([t, l], gi) => (gi ? `<span class="vs">vs</span>` : "") + l.map(p => `<a href="${plHref(p.name)}" title="${esc(p.name)}">${pt(p.name, 34, tc(t), p === mv ? "on" : "")}<span class="rv" style="--c:${tc(t)}">${A_(p.e.mvp)}${fmt(p.mvp)}</span></a>`).join("")).join("")}</div>`;
  const lineupDt = `<div class="lnd">${groups.map(([t, l], gi) => `${gi ? `<div class="vsd2"><span>VS</span></div>` : ""}<div class="lnt" style="--c:${tc(t)}"><div class="fxb O xs lnh">${gi ? `<span class="grow"></span>` : ""}<span class="fx gap6">${gi ? "" : tmk(t)}${tname(t)} · ${m.winners.filter(w => w === t).length || x.sc.parts.find(p => p[0] === t)[1]}${x.win === t ? " · победа" : ""}${gi ? tmk(t) : ""}</span></div><div class="lncols">${l.map((p, i) => `<a class="lnc${p === mv ? " mvp" : ""}" href="${plHref(p.name)}"><div class="lnart">${fig(p.name, `animation-delay:${(.05 * i + gi * .2).toFixed(2)}s`)}</div><div class="lnp"><div class="A lnn">${p.swap ? `<span title="сменил(а) команду" style="display:inline-flex;gap:2px;vertical-align:5px;margin-right:4px">${p.teams.map(z => `<i class="tdot" style="--c:${tc(z)}"></i>`).join("")}</span>` : ""}${esc(p.name)}${p === mv ? ` <span class="tag" style="font-size:9px;vertical-align:4px"><span>MVP</span></span>` : ""}</div><div class="O xs">рейт. <b class="A" style="font-size:24px">${A_(p.e.mvp)}${fmt(p.mvp)}</b></div><div class="fxb N small"><span>${A_(p.e.dealt)}${p.dealt}</span><span>${A_(p.e.recv)}${p.recv}</span><span>${A_(p.e.deaths)}${p.deaths}</span></div><div class="fxb O" style="font-size:11px;color:#888"><span>поп</span><span>пол</span><span>см</span></div></div></a>`).join("")}</div></div>`).join("")}</div>`;
  const g = gunOfKey(mv.gkey);
  const mvpCard = `<div class="mvpcard" style="--c:${tc(mt)}"><div class="artbox">${fig(mv.name)}</div><div class="txt"><div class="fx gap6"><span class="tag"><span>MVP игры</span></span>${tmk(mt)}<span class="O xs">${tname(mt)}</span></div>
    <a class="A" href="${plHref(mv.name)}" style="font-size:52px;display:block;margin-top:10px">${esc(mv.name)}</a><div class="fx gap10" style="margin-top:8px"><span class="A" style="font-size:64px">${A_(mv.e.mvp)}${fmt(mv.mvp)}</span><span class="O xs mu">рейтинг<br>100 = средний</span></div>
    <div class="fx gap14" style="margin-top:14px;border-top:1px solid rgba(255,255,255,.2);padding-top:10px">${[["попал", A_(mv.e.dealt) + mv.dealt], ["получил", A_(mv.e.recv) + mv.recv], ["смертей", A_(mv.e.deaths) + mv.deaths]].map(([k, v]) => `<div><div class="A" style="font-size:34px">${v}</div><div class="O xs mu">${k}</div></div>`).join("")}</div>
    <a class="fx gap10 small" style="margin-top:10px;min-height:44px" href="${gunHref(g)}">${gunImg(mv.gun, 22)}<span>${esc(g ? g.name : mv.gun)} · коэф. ${A_(mv.e.ratio)}${r2(mv.ratio)}</span></a></div></div>`;
  const t3 = [...m.P].sort((a, b) => b.mvp - a.mvp).slice(0, 3);
  const top3 = `${sec(3, "Топ-3 игры", `<a class="lk" href="#${x.key}-players">Все ${m.P.length} ›</a>`)}<div class="top3">${t3.map((p, i) => { const t = mainTeam(m, p); return `<a href="${plHref(p.name)}" style="--c:${tc(t)}"><div class="fx gap6"><span class="A" style="font-size:22px">${i + 1}</span>${pt(p.name, 36, tc(t))}<b class="ell">${esc(p.name)}</b></div><div class="fx gap6">${tmk(t, 1)}<span class="N" style="font-size:20px">${A_(p.e.mvp)}${fmt(p.mvp)}</span></div><div class="xs st dt">попал ${A_(p.e.dealt)}${p.dealt} · получил ${A_(p.e.recv)}${p.recv} · смертей ${p.deaths}</div></a>`; }).join("")}</div>`;
  const flow = m.winners.length ? `<div class="pn">${sec(1, "Ход игры")}<div class="fxb" style="margin-bottom:4px"><span class="cap">линия: ${TL[x.ta]} − ${TL[x.tb]} после раунда</span><span class="legend"><span><i style="--c:${tc(x.ta)}"></i>${tname(x.ta).toLowerCase()}</span><span><i style="--c:${tc(x.tb)}"></i>${tname(x.tb).toLowerCase()}</span></span></div>${flowChart(m, x.ta, x.tb)}${m.swaps.length ? `<p class="note">Пунктир — смена составов после ${m.swaps.join(" и ")}-го раунда.</p>` : ""}${m.winners.some(w => w === null) ? `<p class="note">Пустой столбик — раунд не записан, победитель неизвестен.</p>` : ""}</div>` : "";
  const R = teamRadar(x);
  const radarB = `<div class="pn">${sec(2, "Радар команд")}${radar(R.ax, [{ v: R.va, c: tc(x.ta) }, { v: R.vb, c: tc(x.tb), fo: .18 }], 340, 290, 96)}<div class="legend" style="justify-content:center"><span><i style="--c:${tc(x.ta)}"></i>${tname(x.ta).toLowerCase()}</span><span><i style="--c:${tc(x.tb)}"></i>${tname(x.tb).toLowerCase()}</span><span class="st">100 = лучшая из сторон${R.A.eD || R.B.eD || R.A.eS || R.B.eS ? " · есть оценки ≈" : ""}</span></div></div>`;
  const pairs = m.P.flatMap(a => m.P.map(v => ({ a, v, n: m.estH(a, v) ? 0 : m.val(a, v) })));
  const tp = pairs.reduce((a, y) => y.n > a.n ? y : a, { n: 0 });
  const one1 = tp.n ? `<a class="pn fx gap10 hunt" href="#${x.key}-duels" data-a="dPickGo" data-v="${esc(tp.a.name)}">${icon("swords")}<span class="grow"><b>Больше всех в одного:</b> ${esc(tp.a.name)} → ${esc(tp.v.name)}</span><b class="N" style="font-size:20px">${tp.n}</b></a>` : "";
  const swappers = m.P.filter(p => p.swap);
  const notes = [...(swappers.length ? [`По ходу игры ${swappers.map(p => p.name).join(", ")} ${swappers.length > 1 ? "сменили" : "сменил(а)"} команду${m.swaps.length ? ` после ${m.swaps.map(r => r + "-го").join(" и ")} раунда` : ""}. Попадания засчитаны той команде, за которую игрок был в тот момент.`] : []), ...(x.g.notes || [])];
  const notesB = notes.length ? `<div class="pn"><button class="fxb" style="width:100%;min-height:44px" data-a="noteOpen"><span class="fx gap10">${icon("help")}<span class="O xs">Заметки к игре · ${notes.length}</span></span><span>${ST.noteOpen ? "▲" : "▼"}</span></button>${ST.noteOpen ? notes.map(n => `<p class="note">${esc(n)}</p>`).join("") : ""}</div>` : "";
  return `<div class="ph">${lineupPh}</div><div class="dt pn" style="padding:12px 16px">${lineupDt}</div>
    <div class="ph">${mvpCard}</div>
    <div class="grid3"><div class="col">${flow}${one1}${notesB}</div><div class="col">${radarB}</div><div class="col"><div>${top3}</div><div class="dt">${mvpCard}</div><p class="note dt">Рейтинг MVP: 100 = средний игрок этой игры; половина — попадания, половина — коэффициент.</p></div></div>`;
}
// --- Игроки игры
function gameCols(x) {
  const m = x.m, R = ST.gMode === "rnd", pr = (p, v) => R ? div(v, p.gr) : v, nf = v => R ? r2(v) : fmt(v);
  const c = [
    ["mvp", "Рейтинг", "Рейт.", p => p.mvp, p => A_(p.e.mvp) + fmt(p.mvp)],
    ["dealt", "Попал", "Попал", p => pr(p, p.dealt), p => A_(p.e.dealt) + nf(pr(p, p.dealt))],
    ["recv", "Получил", "Получил", p => pr(p, p.recv), p => A_(p.e.recv) + nf(pr(p, p.recv))],
    ["ratio", "Коэф.", "Коэф.", p => p.ratio, p => A_(p.e.ratio) + r2(p.ratio)],
    ["deaths", "Смерти", "Смерти", p => pr(p, p.deaths), p => A_(p.e.deaths) + nf(pr(p, p.deaths))],
    ["shots", "Выстр.", "Выстрелы", p => pr(p, p.shots), p => A_(p.e.shots) + (R ? onePt(pr(p, p.shots)) : fmt(p.shots))],
    ["acc", "Точн.", "Точность", p => p.acc, p => A_(p.e.acc) + pct(p.acc)],
  ];
  if (m.winners.length) c.push(["alive", "Дожил", "Дожил", p => p.alive ?? -1, p => p.alive == null ? "—" : A_(p.e.alive) + p.alive]);
  if (ST.gFrags) c.push(["frag", "Фраги", "Фраги", p => p.fragEx + p.fragEs, p => (p.fragEs >= .05 ? "~" : "") + Math.round(p.fragEx + p.fragEs)]);
  return c;
}
function gamePlayers(x) {
  const m = x.m, cols = gameCols(x), sk = cols.find(c => c[0] === ST.gSort.k) || cols[0], dir = ST.gSort.dir;
  const rank = new Map([...m.P].sort((a, b) => b.mvp - a.mvp).map((p, i) => [p, i + 1]));
  const groups = teamOrder(x, sortBy(m.P, sk[3], dir));
  const mx = Math.max(1e-9, ...m.P.map(sk[3]).filter(isFinite));
  const ctrl = `<div class="ctrl">${seg(ST.gMode, "gMode", [["tot", "Всего"], ["rnd", "За раунд"]])}<span class="sp"></span>${chip(ST.gFrags, "gFrags", "", "+ Фраги")}${chip(ST.gHelp, "gHelp", "", `${icon("help")}Рейтинг`)}</div>
    ${ST.gHelp ? `<div class="help">Рейтинг MVP — 100 = средний игрок этой игры. Половина — попадания относительно среднего, половина — коэффициент попал / получил относительно среднего (выше 3 считается за 3). ${ST.gMode === "rnd" ? "«За раунд»: попал, получил, смерти и выстрелы поделены на сыгранные раунды." : ""} ${ST.gFrags ? "Фраг — кто попал последним перед смертью; у старых тагеров оценка «~»." : ""}</div>` : ""}`;
  const metricChips = `<div class="chips" style="margin-bottom:12px">${cols.map(c => chip(sk[0] === c[0], "gSort", c[0], c[2] + arrow(sk[0] === c[0], dir), "sm")).join("")}</div>`;
  const teamHead = (t, l) => { const e = l.some(p => p.est.size || p.e.dealt); return `<div class="grp" style="--c:${tc(t)}">${tmk(t)}<span>${tname(t)} · ${x.sc.parts.find(p => p[0] === t)?.[1] ?? ""}</span><span class="s">${x.win === t ? "победа" : ""}${e ? " · ≈ — оценка" : ""}</span></div>`; };
  const phone = groups.map(([t, l]) => teamHead(t, l) + `<div class="thd"><span class="grow">Игрок</span><span style="width:70px;text-align:right">${sk[2]}${arrow(true, dir)}</span><span style="width:58px;text-align:right">поп:пол</span><span style="width:40px;text-align:right">коэф.</span></div>` + l.map(p => { const open = ST.gExp === p.name, g = gunOfKey(p.gkey);
    return `<div class="gpr${open ? " open" : ""}" style="--c:${tc(t)}"><button class="row" style="--c:${tc(t)};width:100%" data-a="gExp" data-v="${esc(p.name)}" aria-expanded="${open}">${pt(p.name, 36, tc(t))}<span class="grow" style="min-width:0"><span class="nm ell" style="display:block">${esc(p.name)}</span><span class="sub ell" style="display:block">${esc(g ? g.name : p.gun)}${p === m.mvp ? " · MVP" : ""}${p.swap ? " · смена команды" : ""}</span></span>
      <span style="width:70px" class="r"><span class="big">${sk[4](p)}</span>${bar(sk[3](p) / mx, tc(t))}</span><span class="N r small" style="width:58px">${A_(p.e.dealt)}${p.dealt}<span class="st">:${p.recv}</span></span><span class="N r small" style="width:40px">${A_(p.e.ratio)}${r2(p.ratio)}</span></button>
      ${open ? `<div class="gdet">${cols.filter(c => !["dealt", "recv", "ratio", sk[0]].includes(c[0])).map(c => `<div><div class="O xs st">${c[2]}</div><div class="N">${c[4](p)}</div></div>`).join("")}<a class="pbtn" href="${plHref(p.name)}">Профиль ›</a>${g ? `<a class="pbtn" href="${gunHref(g)}">${esc(g.name)} ›</a>` : ""}</div>` : ""}</div>`; }).join("")).join("");
  const desk = `<table class="tbl"><thead><tr><th class="c">#</th><th class="l">Игрок</th><th class="l">Пушка</th>${cols.map(c => `<th class="${sk[0] === c[0] ? "on" : ""}"><button data-a="gSort" data-v="${c[0]}">${c[1]}${arrow(sk[0] === c[0], dir)}</button></th>`).join("")}</tr></thead>
    ${groups.map(([t, l]) => `<tbody><tr><td colspan="${cols.length + 3}" style="background:none;border:0;padding:0">${teamHead(t, l)}</td></tr>${l.map(p => { const g = gunOfKey(p.gkey); return `<tr class="lk${isMe(p.name) ? " me" : ""}" style="--c:${tc(t)}" data-href="${plHref(p.name)}"><td class="c st" style="font-size:15px">${rank.get(p)}</td><td class="l nmc"><a class="fx gap10" href="${plHref(p.name)}">${pt(p.name, 38, tc(t))}<span>${esc(p.name)}</span>${p === m.mvp ? `<span class="tag" style="font-size:11px"><span>MVP</span></span>` : ""}${p.swap ? `<span class="fx" style="gap:2px">${p.teams.map(z => `<i class="tdot" style="--c:${tc(z)}"></i>`).join("")}</span>` : ""}</a></td><td class="l"><a class="fx gap6 small mu" style="font-family:var(--B)" href="${gunHref(g)}">${gunImg(p.gun, 18)}${esc(g ? g.name : p.gun)}</a></td>
      ${cols.map(c => c[0] === sk[0] ? `<td><span class="barc">${bar(c[3](p) / mx, tc(t))}<span>${c[4](p)}</span></span></td>` : `<td>${c[4](p)}</td>`).join("")}</tr>`; }).join("")}</tbody>`).join("")}</table>`;
  const sc = scatter(m.P.map(p => { const t = mainTeam(m, p); return { x: p.dealt, y: p.recv, l: p.name, c: tc(t), big: true, href: plHref(p.name), tip: `${p.name}: попал ${p.dealt}, получил ${p.recv}` }; }), "попал", "получил", 360, 250, v => Math.round(v), v => Math.round(v), { diag: true });
  const A = teamStat(m, x.ta), B = teamStat(m, x.tb);
  const trow = (l, a, b, ea, eb, f = fmt) => `<div class="cmprow"><div class="fxb"><b class="N">${A_(ea)}${f(a)}</b><span class="O xs mu">${l}</span><b class="N">${A_(eb)}${f(b)}</b></div>${vsbar(a, b, tc(x.ta), tc(x.tb))}</div>`;
  const teams = `<div class="pn">${sec(3, "Команды")}<div class="fxb O xs" style="margin-bottom:8px"><span class="fx gap6">${tmk(x.ta)}${tname(x.ta)}</span><span class="fx gap6">${tname(x.tb)}${tmk(x.tb)}</span></div>
    ${m.winners.length ? trow("раунды", A.won, B.won, 0, 0, String) : ""}${trow("попадания", A.dealt, B.dealt, A.eD, B.eD)}${trow("выстрелов", A.shots, B.shots, A.eS, B.eS)}${trow("смерти", A.deaths, B.deaths, A.eK, B.eK)}${A.played && B.played ? trow("дожили до конца раунда", A.alive, B.alive, A.eA, B.eA) : ""}</div>`;
  return `<div class="gridm"><div class="col"><div>${sec(1, "Таблица игроков")}${ctrl}<div class="ph">${metricChips}${phone}</div><div class="dt">${desk}</div><p class="note">Рейтинг MVP: 100 = средний игрок этой игры. ${m.winners.length ? `«Дожил» — раундов из ${m.winners.length}, где дожил до конца.` : ""} Заголовки сортируют таблицу.</p></div></div>
    <div class="col"><div class="pn">${sec(2, "Попал / получил")}${sc}<p class="note">Ниже пунктира — попал больше, чем получил.</p></div>${teams}</div></div>`;
}
// --- Дуэли игры
function duelList(rows, cp, co, est, cpF, coF) { // rows [{name, gave, took, eg, et}]
  const k = ST.dSort.k, dir = ST.dSort.dir;
  const f = { gave: r => r.gave, took: r => r.took, tot: r => r.gave + r.took, ratio: r => r.took ? r.gave / r.took : 1e9 + r.gave, name: r => r.name }[k] || (r => r.gave + r.took);
  const list = sortBy(rows, f, dir);
  const mx = Math.max(1, ...rows.map(r => Math.max(r.gave, r.took)));
  const h = (key, l) => `<button class="${k === key ? "on" : ""}" data-a="dSort" data-v="${key}">${l}${arrow(k === key, dir)}</button>`;
  return `<div class="dl"><span class="h">${h("name", "Соперник")}</span><span class="h fxb">${h("gave", "Попал")}${h("took", "Получил")}</span><span class="h r">${h("tot", "Всего")}</span><span class="h r">${h("ratio", "Коэф.")}</span>
    ${list.map(r => { const a = cpF ? cpF(r) : cp, b = coF ? coF(r) : co; return `<a class="who" href="${plHref(r.name)}">${pt(r.name, 36, b)}<span class="ell">${esc(r.name)}</span></a><span class="gt"><span class="nn"><span style="color:${a}">${A_(r.eg)}${r.gave}</span><span style="color:${b}">${A_(r.et)}${r.took}</span></span><span class="fxb" style="gap:2px"><span class="bt" style="flex:1;transform:scaleX(-1)"><i style="width:${r.gave / mx * 100}%;--c:${a}"></i></span><span class="bt" style="flex:1"><i style="width:${r.took / mx * 100}%;--c:${b}"></i></span></span></span><span class="t">${A_(r.eg || r.et)}${r.gave + r.took}</span><span class="t">${A_(r.eg || r.et)}${r.took ? r2(r.gave / r.took) : "∞"}</span>`; }).join("")}</div>`;
}
function gameDuels(x) {
  const m = x.m, { P, val, estH } = m;
  const pick = P.find(p => p.name === ST.dPick[x.key]) || m.mvp;
  const groups = teamOrder(x, [...P].sort((a, b) => b.mvp - a.mvp));
  const picker = `<div class="fxb cap" style="margin-bottom:6px"><span>Выбери игрока</span><span class="ph">листай →</span></div><div class="pstrip">${groups.map(([t, l], gi) => (gi ? `<span class="vsep ph">vs</span>` : "") + l.map(p => `<button class="${p === pick ? "on" : ""}" data-a="dPick" data-v="${esc(p.name)}" aria-pressed="${p === pick}">${pt(p.name, 58, tc(t))}<span class="ell" style="max-width:62px">${esc(p.name)}</span></button>`).join("")).join("")}</div>`;
  const pt0 = mainTeam(m, pick);
  const rows = pick.foes.map(o => ({ name: o.name, gave: val(pick, o), took: val(o, pick), eg: estH(pick, o), et: estH(o, pick), t: mainTeam(m, o) }));
  const tops = (f) => { const mx = Math.max(0, ...pick.foes.map(f)); return { n: mx, w: pick.foes.filter(o => f(o) === mx) }; };
  const tg = tops(o => val(pick, o)), nm = tops(o => val(o, pick));
  const duelB = `<div class="fxb" style="margin:14px 0 8px;gap:10px"><a class="A" href="${plHref(pick.name)}" style="font-size:36px">${esc(pick.name)} <span class="st" style="font-size:24px">vs</span></a><span class="N small mu">${A_(pick.e.dealt)}${pick.dealt} : ${A_(pick.e.recv)}${pick.recv} · ${A_(pick.e.ratio)}${r2(pick.ratio)}</span></div>
    <div class="chips" style="margin-bottom:10px">${[["tot", "Всего"], ["gave", "Попал"], ["took", "Получил"], ["ratio", "Коэф."]].map(([k, l]) => chip(ST.dSort.k === k, "dSort", k, l + arrow(ST.dSort.k === k, ST.dSort.dir), "sm")).join("")}</div>
    ${rows.length ? duelList(rows, tc(pt0), null, null, null, r => tc(r.t)) : `<div class="empty">Нет попаданий</div>`}
    ${pick.swap ? `<p class="note">${esc(pick.name)} менял(а) команду: здесь сумма за всю игру.</p>` : ""}
    <div class="grid2 gk" style="margin-top:14px;gap:8px">${tg.n ? `<div class="gkc"><div class="cap">Груша для битья</div><div class="fx gap10" style="margin-top:6px">${pt(tg.w[0].name, 36)}<div><b>${tg.w.map(o => esc(o.name)).join(", ")} ${tg.n}</b><div class="xs st">ответил ${tg.w.map(o => val(o, pick)).join(", ")}</div></div></div></div>` : ""}${nm.n ? `<div class="gkc"><div class="cap">Личный кошмар</div><div class="fx gap10" style="margin-top:6px">${pt(nm.w[0].name, 36)}<div><b>${nm.w.map(o => esc(o.name)).join(", ")} ${nm.n}</b><div class="xs st">сам ${nm.w.map(o => val(pick, o)).join(", ")}</div></div></div></div>` : ""}</div>`;
  // матрица
  const all = groups.flatMap(([, l]) => l), tOf = new Map(P.map(p => [p, mainTeam(m, p)]));
  const mxv = Math.max(1, ...P.flatMap(a => P.map(v => val(a, v))));
  const cell = (a, v, txt) => { const n = val(a, v), same = tOf.get(a) === tOf.get(v) && !n; if (a === v || same) return `<td class="self"></td>`; return `<td class="${n ? "" : "zero"}${estH(a, v) ? " e" : ""}" style="--c:${tc(tOf.get(a))};--a:${Math.round(12 + 70 * n / mxv)}%" title="${esc(a.name)} → ${esc(v.name)}: ${plural(n, HIT)}">${txt ?? (A_(estH(a, v)) + n)}</td>`; };
  const mDesk = `<table class="mx"><thead><tr><th class="cap">попал ↓ в →</th>${all.map(v => `<th>${pt(v.name, 30, tc(tOf.get(v)))}${esc(v.name)}</th>`).join("")}</tr></thead><tbody>${all.map(a => `<tr><th class="rb" style="--c:${tc(tOf.get(a))}">${esc(a.name)}</th>${all.map(v => cell(a, v)).join("")}</tr>`).join("")}</tbody></table>`;
  const [ra, rb] = ST.mxSwap ? [groups[1], groups[0]] : [groups[0], groups[1]];
  const mPh = ra && rb ? `<div class="hscroll"><table class="mx"><thead><tr><th class="cap">${TL[ra[0]]} ↓<br>${TL[rb[0]]} →</th>${rb[1].map(v => `<th>${pt(v.name, 30, tc(rb[0]))}${esc(v.name)}</th>`).join("")}</tr></thead><tbody>${ra[1].map(a => `<tr><th class="rb" style="--c:${tc(ra[0])}">${esc(a.name)}</th>${rb[1].map(v => { const n = val(a, v), b = val(v, a); return `<td style="--c:${tc(ra[0])};--a:${Math.round(10 + 60 * n / mxv)}%" title="${esc(a.name)} → ${esc(v.name)} ${n}, обратно ${b}">${A_(estH(a, v))}${n}<span class="st">:${b}</span></td>`; }).join("")}</tr>`).join("")}</tbody></table></div><p class="note">${tname(ra[0]).toLowerCase()} → ${tname(rb[0]).toLowerCase()} : обратно · ярче = больше</p>` : "";
  const matrix = `<div class="pn">${sec(2, "Кто в кого", `<button class="lk ph" data-a="mxSwap">${TL[rb ? rb[0] : x.tb]} ↓ ⇄</button>`, `<span class="O xs st dt">строка попала в столбец</span>`)}<div class="ph">${mPh}</div><div class="dt">${mDesk}<p class="note">Строка — кто стрелял, столбец — в кого попал. Своя команда заштрихована. Курсив и «≈» — оценка.</p></div></div>`;
  // личные счёты
  const feuds = `<div class="pn">${sec(3, "Личные счёты")}<div class="feud"><div class="thd" style="padding-left:0"><span class="grow">Игрок</span><span style="width:38%">Груша</span><span style="width:38%">Кошмар</span></div>${groups.flatMap(([t, l]) => l.map(p => { if (!p.foes.length) return ""; const mt1 = Math.max(...p.foes.map(o => val(p, o))), mt2 = Math.max(...p.foes.map(o => val(o, p))); const g1 = p.foes.filter(o => val(p, o) === mt1), g2 = p.foes.filter(o => val(o, p) === mt2);
    return `<button class="frow${p === pick ? " on" : ""}" style="--c:${tc(t)}" data-a="dPick" data-v="${esc(p.name)}">${pt(p.name, 26, tc(t))}<b class="grow ell">${esc(p.name)}</b><span style="width:38%" class="small ell">${g1.map(o => esc(o.name)).join(", ")} <b class="N">${mt1}</b><span class="st"> (${g1.map(o => val(o, p)).join(",")})</span></span><span style="width:38%" class="small ell">${g2.map(o => esc(o.name)).join(", ")} <b class="N">${mt2}</b><span class="st"> (${g2.map(o => val(p, o)).join(",")})</span></span></button>`; })).join("")}</div><p class="note">Груша — в кого больше всех попал (в скобках — ответ). Кошмар — кто больше всех попал в него. Нажми строку — откроются его дуэли.</p></div>`;
  const pairs = P.flatMap(a => P.map(v => ({ a, v, n: val(a, v), e: estH(a, v) }))).filter(z => z.n).sort((p, q) => q.n - p.n).slice(0, 6);
  const pmx = pairs[0] ? pairs[0].n : 1;
  const freq = `<div class="pn dt">${sec(0, "Самые частые попадания")}${pairs.map(z => `<div class="fx gap10" style="min-height:34px">${pt(z.a.name, 26)}<span style="width:80px" class="ell">${esc(z.a.name)}</span><span class="st">→</span><span style="width:80px" class="ell">${esc(z.v.name)}</span><span class="grow">${bar(z.n / pmx, tc(tOf.get(z.a)))}</span><b class="N" style="width:36px;text-align:right">${A_(z.e)}${z.n}</b></div>`).join("")}</div>`;
  return `<div class="duelg"><div class="col"><div>${sec(1, "Дуэли игрока")}${picker}${duelB}</div></div><div class="col">${matrix}</div></div><div class="grid2"><div class="col">${feuds}</div><div class="col">${freq}</div></div>`;
}
// --- Награды игры
function gameAwards(x) {
  const m = x.m, P = m.P;
  const pairs = P.flatMap(a => P.map(v => ({ a, v, n: m.estH(a, v) ? 0 : m.val(a, v) })));
  const tp = pairs.reduce((a, y) => y.n > a.n ? y : a, { n: 0 });
  const noms = nomData(P.map(p => ({ ...p, rounds: p.nR })));
  if (tp.n) noms.push({ title: "Охота открыта", label: "Больше всех в одного соперника", w: [tp.a], v: String(tp.n), icon: "swords", extra: `→ ${tp.v.name}` });
  const i0 = Math.min(ST.aPick[x.key] || 0, noms.length - 1), cur = noms[i0];
  const tOf = p => mainTeam(m, p);
  const tile = (n, i) => `<button class="nom${i === i0 ? " on" : ""}" data-a="aPick" data-v="${i}" aria-pressed="${i === i0}"><span class="nt">${icon(n.icon)}${n.title}</span><span class="who">${n.w.map(r => esc(r.name)).join(", ")}</span><span class="v">${n.v}</span></button>`;
  const big = cur ? `<div class="awbig" style="--c:${tc(tOf(cur.w[0]))}"><div class="awart">${fig(cur.w[0].name)}</div><div class="awtx"><div class="fx gap10"><span class="tag"><span>Номинация ${i0 + 1} из ${noms.length}</span></span>${tmk(tOf(cur.w[0]))}<span class="O xs">${tname(tOf(cur.w[0]))}</span></div>
    <div class="O xs mu" style="margin-top:12px">${cur.title}</div><a class="A" href="${plHref(cur.w[0].name)}" style="font-size:58px;display:block">${cur.w.map(r => esc(r.name)).join(", ")}</a><div class="fx gap10"><span class="A" style="font-size:64px">${cur.v}</span><span class="O xs mu">${esc(cur.label)}${cur.extra ? "<br>" + esc(cur.extra) : ""}</span></div></div></div>` : "";
  const awards = (x.g.awards || []).filter(a => a && a[0]);
  const awCard = ([t, names, stat, txt], i) => { const ns = String(names || "").split(",").map(s => s.trim()).filter(Boolean); const p = P.find(z => z.name === ns[0]); const tt = p ? tOf(p) : null;
    return `<div class="ach u" style="--c:${tt != null ? tc(tt) : "#888"};animation-delay:${(i * .04).toFixed(2)}s">${pt(ns[0] || "?", 52, tt != null ? tc(tt) : "")}<div class="grow"><div class="fxb" style="gap:8px;align-items:baseline"><span class="A" style="font-size:24px">${esc(t)}</span><span class="small">${ns.map(n => `<a href="${plHref(n)}" class="wh"><b>${esc(n)}</b></a>`).join(", ")}</span></div><div class="small" style="line-height:1.3;margin-top:3px"><b>${esc(stat)}.</b> <span class="mu">${esc(txt)}</span></div></div></div>`; };
  const cnt = {}; noms.forEach(n => n.w.forEach(r => { const t = tOf(r); cnt[t] = (cnt[t] || 0) + 1; }));
  const per = {}; noms.forEach(n => n.w.forEach(r => (per[r.name] = per[r.name] || []).push(n.title)));
  const multi = Object.entries(per).filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length);
  return `<div class="gridl"><div class="col"><div>${sec(1, "Номинации игры")}<div class="dt pn">${big}</div><div class="nomg" style="margin-top:10px">${noms.map(tile).join("")}</div>
      <p class="note">${cur ? `${cur.title}: ${esc(cur.label.toLowerCase())}. ` : ""}Нажми плитку — номинация откроется крупно (на ПК). «≈» — часть данных оценена.</p></div></div>
    <div class="col"><div>${sec(2, "Ачивки · одна на игрока", `<span class="O xs mu">${awards.length} из ${P.length}</span>`)}${awards.length ? `<div class="achg">${awards.map(awCard).join("")}</div>` : `<div class="empty">Ачивок для этой игры нет</div>`}</div>
      <div class="pn">${sec(0, "Почётные номинации")}<div class="fxb"><span class="fx gap10">${tmk(x.ta)}<b class="A" style="font-size:36px">${cnt[x.ta] || 0}</b></span><span class="xs st">у какой команды больше номинаций</span><span class="fx gap10"><b class="A" style="font-size:36px">${cnt[x.tb] || 0}</b>${tmk(x.tb)}</span></div>${vsbar(cnt[x.ta] || 0, cnt[x.tb] || 0, tc(x.ta), tc(x.tb))}
      ${multi.length ? `<div class="cap" style="margin-top:14px">по 2 и больше</div><div class="fx" style="gap:16px;flex-wrap:wrap;margin-top:6px">${multi.map(([n, l]) => `<a class="fx gap10" href="${plHref(n)}" style="min-height:44px">${pt(n, 36)}<span><b>${esc(n)}</b><span class="xs st" style="display:block">${l.join(" · ")}</span></span></a>`).join("")}</div>` : ""}<p class="note">Фраги в награды не входят.</p></div></div></div>`;
}
// ---------- Повтор ----------
function pageReplay(date) {
  const x = GL.find(z => z.date === date); if (!x || !x.replay) return pageGames();
  return `<section class="hero">${ptopBack("#" + x.key, `<a href="#games">Игры</a><span class="sep">›</span><a href="#${x.key}">${dd(x.date)}</a><span class="sep">›</span><span>Повтор</span>`)}
    <div class="hin"><div class="dt fx gap10 crumb" style="margin-bottom:10px"><a class="back" href="#${x.key}" data-a="back" data-v="#${x.key}" aria-label="Назад">${BACK}</a><a href="#games">Игры</a><span class="sep">›</span><a href="#${x.key}">${dd(x.date)}</a><span class="sep">›</span><span>Повтор боя</span></div>
    <div class="kick"><span class="tag"><span>Повтор боя</span></span><span class="beta">бета</span><span>${dd(x.date)} · ${scoreHtml(x)}</span></div>
    <div class="A title" style="font-size:72px">Повтор</div>
    <div class="chips" style="margin-top:12px">${GL.filter(z => z.replay).map(z => `<a class="chip${z === x ? " on" : ""}" href="#replay-${z.date}">${dd(z.date)}</a>`).join("")}<a class="chip" href="#${x.key}">К игре ›</a><a class="chip" href="replay.html#${x.date}" target="_blank" rel="noopener">Открыть отдельно ↗</a></div></div></section>
    <iframe class="rframe" id="rframe" src="replay.html#${x.date}" title="Повтор боя ${dd(x.date)}"></iframe>`;
}
