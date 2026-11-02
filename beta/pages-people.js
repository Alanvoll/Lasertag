// Игроки, Разброс, Профиль игрока, Сравнение, Пушки, Пушка.
"use strict";
// ---------- колонки сезонной таблицы ----------
function plCols() {
  const md = ST.plMode, all = ST.plCls === "all";
  const per = (r, v) => md === "avg" ? v / r.games : md === "rnd" ? div(v, r.gr) : md === "dth" ? div(v, r.deaths) : v;
  const nf = v => !isFinite(v) ? "—" : md === "tot" ? fmt(v) : md === "rnd" || md === "dth" ? r2(v) : onePt(v);
  const c = [];
  c.push(md === "rnd" ? ["gr", "Раундов", "Раундов", r => r.gr, r => r.gr] : ["games", "Игр", "Игр", r => r.games, r => r.games]);
  if (all) c.push(["rating", "Рейтинг", "Рейт.", r => r.rating, r => fmt(r.rating)], ["mvps", "MVP", "MVP", r => r.mvps, r => r.mvps ? r.mvps : "—"]);
  c.push(["dealt", "Попал", "Попал", r => per(r, r.dealt), r => nf(per(r, r.dealt))], ["recv", "Получил", "Получил", r => per(r, r.recv), r => nf(per(r, r.recv))],
    ...(md === "dth" ? [["deaths", "Смертей", "Смертей", r => r.deaths, r => fmt(r.deaths)]] : [["deaths", "Смерти", "Смерти", r => per(r, r.deaths), r => nf(per(r, r.deaths))]]),
    ["acc", "Точн.", "Точность", r => md === "avg" ? r.accPerGame : r.acc, r => pct(md === "avg" ? r.accPerGame : r.acc)],
    ["ratio", "Коэф.", "Коэф.", r => md === "avg" ? r.ratioPerGame : r.ratio, r => r2(md === "avg" ? r.ratioPerGame : r.ratio)],
    ["shots", "Выстр.", "Выстрелы", r => per(r, r.shots), r => md === "rnd" || md === "dth" ? onePt(per(r, r.shots)) : fmt(per(r, r.shots))]);
  if (all) c.push(["best", "Лучшая", "Лучшая игра", r => r.best, r => r.best], ["alive", "Дожил", "Дожил", r => r.aliveP ?? -1, r => r.aliveP == null ? "—" : Math.round(r.aliveP * 100) + "%"]);
  return c;
}
function plRows() {
  const base = locData(ST.plLoc).rows.filter(r => r.games >= ST.plMin);
  if (ST.plCls === "all") return base;
  return base.filter(r => r.byCls && r.byCls[ST.plCls]).map(r => ({ ...r.byCls[ST.plCls], name: r.name, slug: r.slug }));
}
function pagePlayers() {
  const cols = plCols(), rows = plRows(), LD = locData(ST.plLoc), MIN = LD.min;
  let sk = cols.find(c => c[0] === ST.plSort.k); if (!sk) sk = cols.find(c => c[0] === "dealt");
  const dir = ST.plSort.dir;
  const sorted = ST.plSort.k === "name" ? sortBy(rows, r => r.name, dir) : sortBy(rows, sk[3], dir);
  const main = sorted.filter(r => r.games >= MIN), rest = sorted.filter(r => r.games < MIN);
  const mx = Math.max(1e-9, ...rows.map(sk[3]).filter(isFinite));
  const rk = new Map(sortBy(main, ST.plCls === "all" ? (r => r.rating) : (r => r.dealt / r.games), -1).map((r, i) => [r.name, i + 1]));
  const ctrl = `<div class="ctrl">${seg(ST.plMode, "plMode", [["avg", "Среднее"], ["rnd", "За раунд"], ["dth", "На 1 смерть"], ["tot", "Всего"]])}</div>
    <div class="ctrl">${seg(ST.plCls, "plCls", [["all", "Все"], ["auto", "Автоматы"], ["pistol", "Пистолет"]])}<span class="sp"></span>${chip(ST.plHelp, "plHelp", "", icon("help") + "Как считаем", "dt")}</div>
    ${LOCS.length > 2 ? `<div class="ctrl">${seg(ST.plLoc, "plLoc", LOCS)}<span class="sp ph"></span>${chip(ST.plHelp, "plHelp", "", icon("help"), "ph")}<span class="sp dt"></span><span class="xs st">${ST.plLoc === "all" ? "" : plural(LD.n, ["игра", "игры", "игр"]) + ": " + GL.filter(x => locOfG(x.g) === ST.plLoc).map(x => dd(x.date)).reverse().join(", ")}</span></div>` : ""}
    <div class="ctrl">${seg(ST.plMin, "plMin", [[1, "Все игроки"], [2, "От 2 игр"], [3, "От 3 игр"], [5, "От 5 игр"]])}${LOCS.length > 2 ? "" : `<span class="sp ph"></span>${chip(ST.plHelp, "plHelp", "", icon("help"), "ph")}`}</div>
    ${ST.plHelp ? `<div class="help">Рейтинг — средний рейтинг MVP за игру (100 = средний игрок игры). «Среднее» — за игру, «За раунд» — суммы поделены на сыгранные раунды, «На 1 смерть» — суммы поделены на число смертей. «Всего» — суммы за сезон. Локация считается только по играм на ней. «От N игр» скрывает тех, кто сыграл меньше. «Автоматы» и «Пистолет» — только игры с этим оружием: у пистолета 5 жизней и одиночные выстрелы. Основной список — от ${MIN} игр.</div>` : ""}`;
  const chips = `<div class="chips" style="margin-bottom:10px">${cols.filter(c => c[0] !== "games" && c[0] !== "gr").map(c => chip(sk[0] === c[0], "plSort", c[0], c[2] + arrow(sk[0] === c[0], dir), "sm")).join("")}</div>`;
  const second = sk[0] === "dealt" ? cols.find(c => c[0] === "ratio") : cols.find(c => c[0] === "dealt");
  const third = sk[0] === "ratio" ? cols.find(c => c[0] === "acc") : cols.find(c => c[0] === "ratio");
  const prow = (r, i) => `<a class="row${isMe(r.name) ? " me" : ""}" href="#player-${r.slug}" style="--c:${i === 0 ? "#fff" : i < 3 ? "#bbb" : "#555"}"><span class="N st" style="width:18px">${rk.get(r.name) || "·"}</span>${pt(r.name, 40)}<span class="grow" style="min-width:0"><span class="nm ell" style="display:block">${esc(r.name)}</span><span class="sub">${plural(r.games, ["игра", "игры", "игр"])}${r.mvps ? ` · ${r.mvps} MVP` : ""}</span></span><span class="r" style="width:84px"><span class="big">${sk[4](r)}</span>${bar(sk[3](r) / mx)}</span><span class="N r small" style="width:46px">${second[4](r)}</span></a>`;
  const phone = `${chips}<div class="thd"><span style="width:18px">#</span><span class="grow">Игрок</span><span style="width:84px;text-align:right">${sk[2]}${arrow(true, dir)}</span><span style="width:46px;text-align:right">${second[2]}</span></div>${main.map(prow).join("")}
    ${rest.length ? (ST.plMore ? `<div class="cap" style="margin:12px 0 6px">меньше ${MIN} игр</div>${rest.map(prow).join("")}<button class="more" data-a="plMore">Свернуть ▲</button>` : `<button class="more" data-a="plMore"><span class="fx" style="gap:2px">${rest.slice(0, 6).map(r => pt(r.name, 24)).join("")}</span><span class="grow">Ещё ${rest.length} ▼</span><span class="xs st" style="text-transform:none;letter-spacing:0">меньше ${MIN} игр</span></button>`) : ""}`;
  const trow = r => `<tr class="lk${isMe(r.name) ? " me" : ""}" data-href="#player-${r.slug}"><td class="c st" style="font-size:15px">${rk.get(r.name) || "·"}</td><td class="l nmc"><a class="fx gap10" href="#player-${r.slug}">${pt(r.name, 38)}<span>${esc(r.name)}</span></a></td>${cols.map(c => c[0] === sk[0] && c[0] !== "games" ? `<td><span class="barc">${bar(c[3](r) / mx)}<span>${c[4](r)}</span></span></td>` : c[0] === "mvps" ? `<td>${r.mvps ? `<span class="fx" style="gap:3px;justify-content:flex-end">${Array.from({ length: r.mvps }, () => '<i style="width:10px;height:14px;background:#fff;transform:skewX(-14deg);display:block"></i>').join("")}</span>` : "—"}</td>` : `<td>${c[4](r)}</td>`).join("")}</tr>`;
  const thead = `<thead><tr><th class="c">#</th><th class="l"><button data-a="plSort" data-v="name">Игрок${arrow(ST.plSort.k === "name", dir)}</button></th>${cols.map(c => `<th class="${sk[0] === c[0] ? "on" : ""}"><button data-a="plSort" data-v="${c[0]}">${c[1]}${arrow(sk[0] === c[0], dir)}</button></th>`).join("")}</tr></thead>`;
  const desk = `<table class="tbl">${thead}<tbody>${main.map(trow).join("")}</tbody>${rest.length && ST.plMore ? `<tbody><tr><td colspan="${cols.length + 2}" style="background:none;border:0" class="cap">меньше ${MIN} игр</td></tr>${rest.map(trow).join("")}</tbody>` : ""}</table>
    ${rest.length ? `<button class="more" data-a="plMore">${ST.plMore ? "Свернуть ▲" : `Ещё ${rest.length} игроков · меньше ${MIN} игр ▼`}</button>` : ""}`;
  const sc = scatter(S.rows.map(r => ({ x: r.dealt / r.games, y: r.recv / r.games, l: r.main ? r.name : "", big: r.main, href: `#player-${r.slug}`, tip: `${r.name}: попал ${onePt(r.dealt / r.games)}, получил ${onePt(r.recv / r.games)} за игру` })), "попал за игру", "получил за игру", 760, 340, v => Math.round(v), v => Math.round(v), { diag: true });
  const scP = scatter(S.rows.map(r => ({ x: r.dealt / r.games, y: r.recv / r.games, l: r.main ? r.name : "", big: r.main, href: `#player-${r.slug}`, tip: `${r.name}: попал ${onePt(r.dealt / r.games)}, получил ${onePt(r.recv / r.games)} за игру` })), "попал за игру", "получил за игру", 360, 260, v => Math.round(v), v => Math.round(v), { diag: true });
  return `<section class="hero">${ptopLogo(`<a class="pbtn" href="#spread">Разброс <span class="beta">бета</span> ›</a>`)}${ghost("#1", "right:-10px;top:20px;font-size:180px")}<div class="ghost dt" style="left:42%;top:30px">Игроки</div>
    <div class="hin fxb" style="align-items:flex-end;gap:20px;flex-wrap:wrap"><div><div class="kick u"><span class="tag"><span>Игроки</span></span><span>рейтинг сезона · основной список от ${MIN} игр${rest.length ? ` · ещё ${rest.length}` : ""}</span></div><div class="A title il">Рейтинг</div></div>
    <a class="pbtn dt" href="#spread" style="position:relative;z-index:3">Разброс по играм <span class="beta">бета</span> ›</a></div></section>
    <div class="below"><div class="gridm"><div class="col"><div>${sec(1, "Основной рейтинг", "", `<span class="O xs st">от ${MIN} игр</span>`)}${ctrl}<div class="ph">${phone}</div><div class="dt">${desk}</div></div>
      <div class="pn">${sec(2, "Попал / получил за игру", "", `<span class="O xs st">все ${S.rows.length}</span>`)}<div class="ph">${scP}</div><div class="dt">${sc}</div><p class="note">Крупные — основной список. Ниже пунктира — попадает больше, чем получает. Точка ведёт в профиль.</p></div></div>
    <div class="col"><div>${sec(3, "Сравнить игроков")}${compareBlock()}</div></div></div></div>`;
}
// ---------- сравнение ----------
function compareBlock(fixA) {
  const def = MAIN[0] || S.rows[0];
  let a = BYNAME.get(fixA || ST.cmpA) || def;
  let b = BYNAME.get(ST.cmpB) || null;
  if (!b || b === a) { const foes = sortBy(seasonFoes(a), r => r.gave + r.took, -1); b = (foes[0] && BYNAME.get(foes[0].n)) || MAIN.find(r => r !== a) || S.rows.find(r => r !== a); }
  const va = radarVals(a), vb = radarVals(b);
  const ahead = va.filter((v, i) => v > vb[i] + .5).length, behind = va.filter((v, i) => v < vb[i] - .5).length;
  const close = RAX.map(([l], i) => [l, Math.abs(va[i] - vb[i])]).sort((p, q) => p[1] - q[1])[0];
  const metric = (l, fa, fb, show, low) => { const x = fa, y = fb; const best = low ? Math.min(x, y) : Math.max(x, y); const w = v => !isFinite(v) || !best ? .05 : low ? (v ? best / v : 1) : v / best;
    return `<div class="cmprow"><div class="fxb"><b class="N tP1">${show(x)}</b><span class="O xs mu">${l}</span><b class="N tP2">${show(y)}</b></div><div class="fx" style="gap:4px"><span class="bt" style="flex:1;transform:scaleX(-1)"><i style="width:${w(x) * 100}%;--c:var(--P1)"></i></span><span class="bt" style="flex:1"><i style="width:${w(y) * 100}%;--c:var(--P2)"></i></span></div></div>`; };
  const strip = [...MAIN, ...S.rows.filter(r => !r.main).sort((p, q) => q.games - p.games || q.rating - p.rating)];
  const ab = a.pairs[b.name] || 0, ba = b.pairs[a.name] || 0, met = (a.meet || {})[b.name] || 0;
  const slot = fixA ? "B" : (ST.cmpSlot || "B");
  return `<div class="cmp">${fixA ? "" : `<div class="ctrl"><span class="cap">выбираю:</span>${seg(slot, "cmpSlot", [["A", `<i class="tdot" style="--c:var(--P1)"></i> Игрок 1`], ["B", `<i class="tdot" style="--c:var(--P2)"></i> Игрок 2`]], "sm")}<button class="chip sm" data-a="cmpSwap" aria-label="Поменять местами">⇄</button></div>`}
    <div class="pstrip" style="margin-bottom:10px">${strip.map(r => `<button class="${r === a || r === b ? "on" : ""}" aria-pressed="${r === a || r === b}" data-a="cmpPick" data-v="${esc(r.name)}" ${fixA && r === a ? "disabled" : ""}>${pt(r.name, 50, r === a ? "var(--P1)" : r === b ? "var(--P2)" : "")}<span class="ell" style="max-width:60px;${r === a ? "color:var(--P1)" : r === b ? "color:var(--P2)" : ""}">${esc(r.name)}</span></button>`).join("")}</div>
    ${vsBanner(a.name, b.name, null, null, true).replace('data-v="A"', fixA ? 'data-v="B"' : 'data-v="A"')}
    <div class="cmpgrid"><div>${radar(radarAxes(null), [{ v: va, c: "var(--P1)" }, { v: vb, c: "var(--P2)", fo: .18 }], 300, 250, 82)}</div>
      <div><div class="legend" style="flex-direction:column;align-items:flex-start;gap:6px"><span><i style="--c:var(--P1)"></i>${esc(a.name)} · ${plural(a.games, ["игра", "игры", "игр"])}</span><span><i style="--c:var(--P2)"></i>${esc(b.name)} · ${plural(b.games, ["игра", "игры", "игр"])}</span></div>
      <p class="note">${ahead === RAX.length ? `${esc(a.name)} впереди по всем ${RAX.length} осям.` : behind === RAX.length ? `${esc(b.name)} впереди по всем ${RAX.length} осям.` : `${esc(a.name)} впереди по ${ahead} из ${RAX.length} осей, ${esc(b.name)} — по ${behind}.`} Ближе всего — ${close[0].toLowerCase().replace(/\.$/, "")}. 100 = лучший среди игроков от ${MIN} игр.</p></div></div>
    ${metric("рейтинг", a.rating, b.rating, fmt)}${metric("попал / игра", a.dealt / a.games, b.dealt / b.games, onePt)}${metric("точность", a.accPerGame, b.accPerGame, pct)}${metric("коэф.", a.ratioPerGame, b.ratioPerGame, r2)}
    ${metric("дожил", a.aliveP ?? 0, b.aliveP ?? 0, v => Math.round(v * 100) + "%")}${metric("смертей / игра", a.deaths / a.games, b.deaths / b.games, onePt, true)}${metric("MVP", a.mvps, b.mvps, String)}${metric("игр", a.games, b.games, String)}
    <div class="cmpduel">${icon("swords")}<span class="O xs grow">дуэль между ними${met ? ` · ${plural(met, ["игра", "игры", "игр"])}` : ""}</span><span class="A" style="font-size:34px"><span class="tP1">${ab}</span><span class="st">:</span><span class="tP2">${ba}</span></span></div>
    ${ab + ba ? `<div class="vsb"><i style="flex:${ab};--c:var(--P1)"></i><i style="flex:${ba};--c:var(--P2)"></i></div>` : `<p class="note">Друг в друга не попадали: ни разу не были соперниками.</p>`}</div>`;
}
function pickSheet() {
  if (!ST.sheet) return "";
  const cur = ST.sheet === "A" ? ST.cmpA : ST.cmpB;
  return `<div class="sheet" data-a="sheetClose"><div class="box" data-stop="1"><div class="fxb"><span class="A" style="font-size:28px">${ST.sheet === "A" ? "Игрок 1" : "Игрок 2"}</span><button class="chip sm" data-a="sheetClose">Закрыть ✕</button></div>
    <div class="grid">${[...S.rows].sort((a, b) => b.games - a.games || b.rating - a.rating).map(r => `<button class="${cur === r.name ? "on" : ""}" data-a="sheetPick" data-v="${esc(r.name)}">${pt(r.name, 56)}<span>${esc(r.name)}</span><small>${plural(r.games, ["игра", "игры", "игр"])}</small></button>`).join("")}</div></div></div>`;
}
// ---------- разброс (бета), логика spreadInit live-сайта ----------
const SP = {
  k: { lead: "Сколько попаданий игрок делал в игре: среднее, худшая и лучшая игра.", lo: "худшая", hi: "лучшая" },
  r: { lead: "Сколько попаданий игрок получал в игре. Меньше — лучше, поэтому сверху те, кто получал меньше всех.", lo: "больше", hi: "меньше", asc: true },
  q: { lead: "Коэффициент попал / получил по играм — самый устойчивый показатель уровня игры.", lo: "худшая", hi: "лучшая" },
  kx: { lead: "Сколько попаданий игрок делал на одну свою смерть, по играм.", lo: "худшая", hi: "лучшая" },
  rx: { lead: "Сколько попаданий игрок получал на одну свою смерть. Минимум 4 (пистолет 5).", lo: "меньше", hi: "больше" } };
function pageSpread() {
  const by = new Map();
  S.models.forEach(m => m.P.forEach(p => { const l = by.get(p.name) || []; by.set(p.name, l); l.push({ d: dd(m.g.date), k: p.dealt, r: p.recv, x: p.deaths, g: p.gr, pist: clsOf(p) === "pistol", ek: !!p.e.dealt, er: !!p.e.recv, ex: !!p.e.deaths }); }));
  const md = ST.spMode, T = SP[md], per = md === "k" || md === "r";
  const val = x => md === "kx" ? (x.x ? x.k / x.x : null) : md === "rx" ? (x.x ? x.r / x.x : null) : md === "q" ? (x.r ? x.k / x.r : null) : (md === "k" ? x.k : x.r) / (ST.spNorm === "rd" ? x.g : 1);
  const est = x => md === "k" ? x.ek : md === "r" ? x.er : md === "q" ? x.ek || x.er : md === "kx" ? x.ek || x.ex : x.er || x.ex;
  const f = v => per && ST.spNorm === "g" ? one(v) : r2(v), A = on => on ? "≈" : "", gw = n => plural(n, ["игра", "игры", "игр"]);
  const st = v => ({ avg: sum(v, x => x.v) / v.length, lo: v.reduce((a, x) => x.v < a.v ? x : a), hi: v.reduce((a, x) => x.v > a.v ? x : a), n: v.length, e: v.some(x => x.e) });
  const rows = [...by].map(([n, g]) => { const v = g.map(x => ({ ...x, v: val(x), e: est(x) })).filter(x => x.v != null); if (!v.length) return null;
    const a = v.filter(x => !x.pist), p = v.filter(x => x.pist); return { n, all: st(v), parts: [a.length && ["Автомат", st(a)], p.length && ["Пистолет", st(p)]].filter(Boolean) }; })
    .filter(r => r && (!ST.spHide1 || r.all.n > 1)).sort((a, b) => T.asc ? a.all.avg - b.all.avg : b.all.avg - a.all.avg);
  const vals = [...by.values()].flat().map(val).filter(x => x != null), mx = Math.max(...vals) * 1.04, mn = md === "rx" ? 3.5 : 0;
  const pos = x => ((x - mn) / (mx - mn) * 100).toFixed(1) + "%";
  const L = t => T.asc ? t.hi : t.lo, R = t => T.asc ? t.lo : t.hi;
  const part = (lab, t, showLab) => `${showLab ? `<div class="xs mu" style="grid-column:1/-1">${lab} <b class="N wh">${A(t.e)}${f(t.avg)}</b> · ${t.n > 1 ? gw(t.n) : "игра " + t.hi.d}</div>` : ""}${t.n > 1 ? `<div class="tr"><i style="left:${pos(t.lo.v)};width:calc(${pos(t.hi.v)} - ${pos(t.lo.v)} + 2px)"></i><u style="left:${pos(t.avg)}"></u></div><div class="mm"><span>${T.lo} <b class="N wh">${A(L(t).e)}${f(L(t).v)}</b> · ${L(t).d}</span><span>${T.hi} <b class="N wh">${A(R(t).e)}${f(R(t).v)}</b> · ${R(t).d}</span></div>` : ""}`;
  return `<section class="hero">${ptopBack("#players", `<a href="#players">Игроки</a><span class="sep">›</span><span>Разброс</span>`)}<div class="ghost dt" style="left:40%;top:30px">Разброс</div>
    <div class="hin"><div class="dt fx gap10 crumb" style="margin-bottom:10px"><a class="back" href="#players" data-a="back" data-v="#players" aria-label="Назад">${BACK}</a><a href="#players">Игроки</a><span class="sep">›</span><span>Разброс по играм</span></div>
    <div class="kick"><span class="tag"><span>Сезон · ${gw(DATA.games.length)}</span></span><span class="beta">бета</span></div><div class="A title" style="font-size:80px">Разброс</div><p class="mu" style="margin-top:8px;max-width:640px">${T.lead}</p></div></section>
    <div class="below"><div><div class="chips" style="margin-bottom:10px">${[["k", "Попал"], ["r", "Получил"], ["q", "Попал / получил"], ["kx", "Попал на смерть"], ["rx", "Получил на смерть"]].map(([k, l]) => chip(md === k, "spMode", k, l)).join("")}</div>
      <div class="ctrl">${per ? seg(ST.spNorm, "spNorm", [["g", "За игру"], ["rd", "За раунд"]]) : ""}<label class="chk"><input type="checkbox" data-a="spHide1" ${ST.spHide1 ? "checked" : ""}> Скрыть с одной игрой</label><span class="sp"></span><span class="small mu">Среднее по игрокам <b class="N wh">${rows.length ? f(sum(rows, r => r.all.avg) / rows.length) : "—"}</b></span></div>
      <div class="spg">${rows.map(r => { const two = r.parts.length > 1; return `<a class="spc" href="${plHref(r.n)}"><div class="fx gap10">${pt(r.n, 32)}<div><b class="wh">${esc(r.n)}</b><div class="xs st">${r.all.n > 1 ? gw(r.all.n) : ""}${!two && r.parts[0][0] === "Пистолет" ? " · пистолет" : ""}</div></div></div><div class="r"><div class="A" style="font-size:30px">${A(r.all.e)}${f(r.all.avg)}</div><div class="xs st">${r.all.n > 1 ? "в среднем" : "игра " + r.all.hi.d}</div></div>${r.parts.map(([l, t]) => part(l, t, two)).join("")}</a>`; }).join("")}</div>
      <p class="note">Крупная цифра — среднее по играм. Полоска: от худшей до лучшей игры, черта — среднее. «≈» — в игре часть данных оценена.</p></div></div>`;
}
// ---------- профиль ----------
function playerHistory(s) { return gamesOf(s.name); }
function pagePlayer(sl, tab) {
  const s = BYSLUG.get(sl); if (!s) return pagePlayers();
  const games = playerHistory(s);
  const teams = [...new Set(games.flatMap(x => x.p.teams))];
  const gunsBy = sortBy(s.gunList, g => g.games, -1);
  const mainGun = gunsBy[0] && gunsBy[0].gun;
  const won = SEASON_NOM_LIST.filter(n => n.w.includes(s));
  const awI = Math.min(ST.awPick, Math.max(0, won.length - 1)), aw = won[awI];
  const mvpDates = games.filter(x => x.m.mvp === x.p).map(x => dd(x.date)).reverse();
  const base = `#player-${s.slug}`;
  const teamLine = teams.length === 1 ? `${tmk(teams[0])}<span>всегда ${tname(teams[0]).toLowerCase()}</span>` : `<span class="fx" style="gap:3px">${games.slice().reverse().map(x => x.p.teams.map(t => `<i class="tdot" style="--c:${tc(t)}"></i>`).join("")).join("")}</span><span>команды по играм</span>`;
  const hero = `<section class="hero phero">${ptopBack("#players", `<a href="#players">Игроки</a><span class="sep">›</span><span class="ell">${esc(s.name)}</span>`, `<a class="pbtn" href="${base}-compare">${icon("compare")}Сравнить</a>`)}
    <div class="artbox">${fig(s.name, "height:100%")}</div><div class="ghost dt" style="right:2%;top:20px">${esc(s.name.split(" ")[0])}</div>
    <div class="hin phin"><div class="phl"><div class="dt fx gap10 crumb" style="margin-bottom:20px"><a class="back" href="#players" data-a="back" data-v="#players" aria-label="Назад">${BACK}</a><a href="#players">Игроки</a><span class="sep">›</span><span>${esc(s.name)}</span>${isMe(s.name) ? `<span class="tag"><span>это ты</span></span>` : ""}</div>
      <div class="A pname il">${esc(s.name)}</div>
      <div class="kick u" style="margin-top:10px">${teamLine}${mainGun ? `<span>· ${esc(mainGun.name)}</span>` : ""}<span class="dt">· ${s.games} игр из ${GL.length}</span></div>
      <div class="fx u d2" style="gap:22px;margin-top:14px;align-items:flex-end">${[[fmt(s.rating), "рейтинг"], [s.rank ? "#" + s.rank : "—", s.rank ? `от ${MIN} игр` : `меньше ${MIN} игр`], [s.mvps, "MVP" + (mvpDates.length ? `<span class="dt"> · ${mvpDates.join(", ")}</span>` : "")]].map(([v, k]) => `<div><div class="A" style="font-size:58px;line-height:.9">${v}</div><div class="O xs" style="margin-top:4px">${k}</div></div>`).join("")}</div></div>
      <div class="phr">${won.length ? `<div class="cap dt" style="margin-bottom:8px">награды сезона</div><div class="awd">${won.map((n, i) => `<button class="${i === awI ? "on" : ""}" data-a="awPick" data-v="${i}" title="${esc(n.title)}" aria-pressed="${i === awI}">${icon(n.icon)}</button>`).join("")}</div>
        <div class="awbox"><div class="fx gap10"><span class="tag"><span>${aw.title}</span></span><b class="N">${aw.v}</b></div><div class="small mu" style="margin-top:4px">${esc(aw.label)}${aw.title === "MVP" ? `, среди игроков от ${MIN} игр` : ""}.</div></div>`
        : `<div class="awbox"><div class="cap">лучшая игра</div><div class="small" style="margin-top:4px"><b class="N">${s.best}</b> попаданий за игру</div></div>`}</div></div></section>`;
  const tabs = `<nav class="tabs" aria-label="Вкладки игрока">${[["", "Обзор"], ["games", "По играм"], ["guns", "Пушки"], ["duels", "Дуэли"], ["compare", "Сравнить"]].map(([k, l]) => `<a href="${base}${k ? "-" + k : ""}" class="${(tab || "") === k ? "on" : ""}" ${(tab || "") === k ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
  const body = tab === "games" ? playerGames(s, games) : tab === "guns" ? playerGuns(s) : tab === "duels" ? playerDuels(s) : tab === "compare" ? `<div style="max-width:760px">${sec(1, "Сравнить с …")}${compareBlock(s.name)}</div>` : playerOverview(s, games);
  return hero + tabs + `<div class="below">${body}</div>`;
}
const PMET = [["mvp", "Рейтинг", p => p.mvp, v => fmt(v), 1], ...PROG.map(([k, l, f, show, b]) => [k, l, f, show, b])];
function progChart(s, games) {
  const mt = PMET.find(x => x[0] === ST.pg.metric) || PMET[0];
  const list = [...games].reverse();
  const pts = list.map(x => { const o = x.m.P.map(mt[2]).filter(isFinite); return { lab: dd(x.date), v: mt[2](x.p), avg: o.length ? sum(o, v => v) / o.length : NaN, mark: x.m.mvp === x.p, href: "#" + x.key, tip: `${dd(x.date)}: ${mt[3](mt[2](x.p))}` }; });
  return `<div class="chips" style="margin-bottom:10px">${PMET.map(([k, l]) => chip(mt[0] === k, "pgMetric", k, l, "sm")).join("")}</div>
    ${list.length > 1 ? lineChart(pts, mt[3], 400, 210, { label: mt[1] }) : `<div class="empty">Одна игра — графика пока нет</div>`}
    <div class="legend"><span><i style="--c:#fff"></i>${esc(s.name)}</span><span><i style="--c:transparent;border-top:1px dashed #aaa;height:0"></i>среднее всех в игре</span><span>◆ = MVP игры</span>${mt[4] < 0 ? `<span class="st">меньше — лучше</span>` : ""}</div>`;
}
function gameTable(s, games) {
  return `<div class="hscroll"><table class="tbl ptbl"><thead><tr><th class="l">Игра</th><th class="l">Счёт</th><th class="l dtc">Пушка</th><th>Рейт</th><th>Поп : пол</th><th>Коэф.</th><th class="dtc">Смерти</th><th class="dtc">Выстр.</th><th>Точн.</th><th class="dtc">Дожил</th></tr></thead><tbody>
  ${games.map(x => { const p = x.p, t = mainTeam(x.m, p), g = gunOfKey(p.gkey); return `<tr class="lk${x.m.mvp === p ? " me" : ""}" data-href="#${x.key}" style="--c:${tc(t)}"><td class="l"><a class="A" style="font-size:24px" href="#${x.key}">${dd(x.date)}</a></td><td class="l"><span class="N">${scoreHtml(x)}</span>${x.m.mvp === p ? ` <span class="tag" style="font-size:11px"><span>MVP</span></span>` : ""}</td><td class="l dtc small mu" style="font-family:var(--B)">${esc(g ? g.name : p.gun)}</td>
    <td>${A_(p.e.mvp)}${fmt(p.mvp)}</td><td>${A_(p.e.dealt)}${p.dealt}<span class="st">:${A_(p.e.recv)}${p.recv}</span></td><td>${A_(p.e.ratio)}${r2(p.ratio)}</td><td class="dtc">${A_(p.e.deaths)}${p.deaths}</td><td class="dtc">${A_(p.e.shots)}${fmt(p.shots)}</td><td>${A_(p.e.acc)}${pct(p.acc)}</td><td class="dtc">${p.alive == null ? "—" : A_(p.e.alive) + p.alive + "/" + p.nR}</td></tr>`; }).join("")}</tbody></table></div>
  ${games.some(x => x.p.est.size || x.p.e.dealt) ? `<p class="note">«≈» — оценка: в той игре часть тагеров не считана.</p>` : ""}`;
}
function feudCards(s) {
  const foes = seasonFoes(s);
  if (!foes.length) return "";
  const tg = foes.reduce((a, b) => b.gave > a.gave ? b : a), nm = foes.reduce((a, b) => b.took > a.took ? b : a);
  const pool = foes.filter(r => r.gave + r.took >= 30); const bx = (pool.length ? pool : foes).filter(r => r.took).reduce((a, b) => b.gave / b.took > a.gave / a.took ? b : a, (pool.length ? pool : foes).find(r => r.took) || foes[0]);
  const over = foes.filter(r => r.took > r.gave);
  const c = (lab, r, txt) => `<a class="gkc" href="${plHref(r.n)}"><div class="cap">${lab}</div><div class="fx gap10" style="margin-top:6px">${pt(r.n, 40)}<div><b>${esc(r.n)}</b><div class="small N">${txt}</div></div></div></a>`;
  return `<div class="grid2 gk" style="gap:8px">${tg === nm ? c("Груша и кошмар", tg, `${tg.gave} : ${tg.took}`) : c("Груша для битья", tg, `попал ${tg.gave} · получил ${tg.took}`) + c("Личный кошмар", nm, `получил ${nm.took} · попал ${nm.gave}`)}${bx && bx.took ? c("Лучший размен", bx, `${bx.gave} : ${bx.took} · ${r2(bx.gave / bx.took)}`) : ""}</div>
    ${over.length ? `<p class="note">${over.length === 1 ? "Перебил его только" : "Перебили его"}: ${over.map(r => `${esc(r.n)} ${r.took} : ${r.gave}`).join(", ")}.</p>` : `<p class="note">Никто не попал в него больше, чем он в ответ.</p>`}`;
}
function playerOverview(s, games) {
  const tiles = [["попал", fmt(s.dealt)], ["получил", fmt(s.recv)], ["смертей", fmt(s.deaths)], ["выстрелов", fmt(s.shots)], ["точность", pct(s.acc)], ["коэф.", r2(s.ratio)]];
  const auto = s.byCls && s.byCls.auto, pist = s.byCls && s.byCls.pistol;
  const gunsBy = sortBy(s.gunList, g => g.games, -1);
  const gl = `<div class="gunline">${gunsBy.slice(0, 2).map(g => `<a class="fx gap10" href="${gunHref(g.gun)}" style="min-height:44px">${gunImg(g.gun.name, 22)}<b>${esc(g.gun.name)} ${g.games}/${s.games}</b></a>`).join("")}<span class="xs st">${auto ? `автомат: ${plural(auto.games, ["игра", "игры", "игр"])}` : ""}${auto && pist ? " · " : ""}${pist ? `пистолет: ${plural(pist.games, ["игра", "игры", "игр"])}` : ""}</span></div>`;
  const hist = `<div class="hist">${games.map(x => `<a href="#${x.key}" class="${x.m.mvp === x.p ? "mvp" : ""}"><div class="fxb"><span class="A" style="font-size:24px">${dd(x.date)}</span><span class="N" style="font-size:20px">${A_(x.p.e.mvp)}${fmt(x.p.mvp)}</span></div><div class="fxb xs"><span class="N">${scoreHtml(x)}${x.m.mvp === x.p ? ' <b class="wh">· MVP</b>' : ""}</span><span class="N">${A_(x.p.e.dealt)}${x.p.dealt}<span class="st">:${x.p.recv}</span></span></div></a>`).join("")}</div>`;
  return `<div class="grid3"><div class="col"><div class="pn">${sec(1, "Профиль")}${radar(radarAxes(s), [{ v: radarVals(s), c: "#fff", fo: .25 }], 320, 270, 88)}<p class="cap c">100 = лучший среди игроков от ${MIN} игр</p></div><div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("")}</div>${gl}</div>
    <div class="col"><div>${sec(2, "Прогресс по играм", `<a class="lk" href="#player-${s.slug}-games">Таблица ›</a>`)}${progChart(s, games)}</div><div>${sec(0, `История · ${plural(games.length, ["игра", "игры", "игр"])}`, "", `<span class="O xs st">рейт · поп:пол</span>`)}${hist}</div></div>
    <div class="col"><div>${sec(3, "Пушки", `<a class="lk" href="#player-${s.slug}-guns">Все ›</a>`)}${gunCardsMini(s)}</div><div>${sec(4, "Дуэли сезона", `<a class="lk" href="#player-${s.slug}-duels">Все ${seasonFoes(s).length} ›</a>`)}${duelMini(s)}</div>${feudCards(s)}</div></div>`;
}
function duelMini(s) {
  const rows = sortBy(seasonFoes(s), r => r.gave + r.took, -1).slice(0, 5), mx = Math.max(1, ...rows.map(r => r.gave + r.took));
  return rows.map(r => `<a class="fx gap10" style="min-height:40px" href="${plHref(r.n)}">${pt(r.n, 28)}<span style="width:80px" class="ell">${esc(r.n)}</span><span class="grow"><span class="vsb" style="width:${(r.gave + r.took) / mx * 100}%"><i style="flex:${r.gave};--c:var(--P1)"></i><i style="flex:${r.took};--c:var(--P2)"></i></span></span><b class="N" style="width:70px;text-align:right">${r.gave} : ${r.took}</b></a>`).join("") + `<div class="legend" style="margin-top:6px"><span><i style="--c:var(--P1)"></i>попал</span><span><i style="--c:var(--P2)"></i>получил</span></div>`;
}
function gunCardsMini(s) {
  const auto = s.byCls && s.byCls.auto, pist = s.byCls && s.byCls.pistol;
  const best = cls => sortBy(s.gunList.filter(g => g.gun && g.gun.cls === cls), g => g.games, -1)[0];
  const card = (lab, c, g) => `<a class="gkc" href="${g ? gunHref(g.gun) : "#guns"}"><div class="cap">${lab}</div>${c ? `<div class="A" style="font-size:28px;margin-top:4px">${esc(g.gun.name)} ${g.games}/${s.games}</div><div class="xs st">${fmt(c.dealt)} попал · ${pct(c.acc)} · коэф. ${r2(c.ratio)}</div>${gunImg(g.gun.name, 30)}` : `<div class="A st" style="font-size:28px;margin-top:4px">0 игр</div><div class="xs st">не играл</div>`}</a>`;
  return `<div class="grid2 gk" style="gap:8px">${card("Автомат", auto, best("auto"))}${card("Пистолет", pist, best("pistol"))}</div>`;
}
function playerGames(s, games) {
  return `<div class="grid2"><div>${sec(1, "Прогресс", "", seg(ST.pg.view, "pgView", [["chart", "График"], ["table", "Таблица"]], "sm"))}${ST.pg.view === "chart" ? progChart(s, games) + `<p class="note">Одна точка — одна игра. Попадания, смерти и выстрелы — за раунд, чтобы сравнивать игры разной длины. Пунктир — среднее всех игроков той игры. Точка ведёт на игру.</p>` : gameTable(s, games)}</div>
    <div>${sec(2, "Все игры")}${gameTable(s, games)}</div></div>`;
}
function playerGuns(s) {
  const list = sortBy(s.gunList, g => g.games, -1);
  const auto = s.byCls && s.byCls.auto, pist = s.byCls && s.byCls.pistol;
  const cmp = auto && pist ? `<div class="pn">${sec(2, "Автомат и пистолет")}${[["игр", auto.games, pist.games, String], ["попал за игру", auto.dealt / auto.games, pist.dealt / pist.games, onePt], ["получил за игру", auto.recv / auto.games, pist.recv / pist.games, onePt], ["коэф.", auto.ratio, pist.ratio, r2], ["точность", auto.acc, pist.acc, pct], ["смертей за игру", auto.deaths / auto.games, pist.deaths / pist.games, onePt]].map(([l, a, b, f]) => `<div class="cmprow"><div class="fxb"><b class="N">${f(a)}</b><span class="O xs mu">${l}</span><b class="N">${f(b)}</b></div>${vsbar(a, b, "#fff", "#777")}</div>`).join("")}<div class="fxb O xs mu" style="margin-top:6px"><span>автомат</span><span>пистолет</span></div><p class="note">У пистолета 5 жизней и одиночные выстрелы — сравнивай отдельно.</p></div>` : "";
  return `<div class="gridm"><div class="col"><div>${sec(1, "На каких пушках")}${list.map(g => `<a class="row" href="${gunHref(g.gun)}" style="min-height:64px">${gunImg(g.gun.name, 30) || `<span class="O xs st" style="width:72px">${esc(g.gun.cls === "pistol" ? "пист." : "авт.")}</span>`}<span class="grow"><span class="nm" style="display:block">${esc(g.gun.name)}</span><span class="sub">${plural(g.games, ["игра", "игры", "игр"])} · ${CLS1[g.gun.cls]}</span></span><span class="r"><span class="big">${fmt(g.dealt)}</span><span class="sub" style="display:block">попал</span></span><span class="r N small" style="width:56px">${pct(g.acc)}<span class="sub" style="display:block">точн.</span></span><span class="r N small" style="width:48px">${r2(g.ratio)}<span class="sub" style="display:block">коэф.</span></span><span class="chev">›</span></a>`).join("")}<p class="note">Сумма по всем играм с этим тагером. Строка ведёт на страницу пушки.</p></div></div><div class="col">${cmp}</div></div>`;
}
function playerDuels(s) {
  const rows = seasonFoes(s).map(r => ({ name: r.n, gave: r.gave, took: r.took }));
  return `<div class="gridm"><div class="col"><div>${sec(1, "Дуэли за сезон", "", `<span class="O xs st">${rows.length} соперников</span>`)}<div class="chips" style="margin-bottom:10px">${[["tot", "Всего"], ["gave", "Попал"], ["took", "Получил"], ["ratio", "Коэф."]].map(([k, l]) => chip(ST.dSort.k === k, "dSort", k, l + arrow(ST.dSort.k === k, ST.dSort.dir), "sm")).join("")}</div>${duelList(rows, "var(--P1)", "var(--P2)")}<p class="note">Попал — сколько раз он попал в соперника, получил — сколько соперник в него, за все игры сезона.</p></div></div><div class="col"><div>${sec(2, "Личные счёты")}${feudCards(s)}</div></div></div>`;
}
// ---------- ПУШКИ ----------
function gunGames(g) { return GL.map(x => ({ ...x, p: x.m.P.flatMap(gunUnits).find(p => p.gkey === g.gkey) })).filter(x => x.p); }
function pageGuns(sl) {
  const open = sl ? GUNSLUG.get(sl) : null;
  const hits = sum(S.guns, g => g.dealt), shots = sum(S.guns, g => g.shots);
  const pist = S.guns.filter(g => g.cls === "pistol"), autos = S.guns.filter(g => g.cls === "auto");
  const cs = l => finStat({ games: sum(l, g => g.games), dealt: sum(l, g => g.dealt), recv: sum(l, g => g.recv), shots: sum(l, g => g.shots), deaths: sum(l, g => g.deaths) });
  const P = cs(pist), Au = cs(autos);
  const avg = ST.gunMode === "avg";
  const cols = [["games", "Игр", g => g.games, g => g.games], ["dealt", avg ? "Попал / игра" : "Попаданий", g => avg ? g.dealt / g.games : g.dealt, g => avg ? onePt(g.dealt / g.games) : fmt(g.dealt)],
    ["acc", "Точн.", g => g.acc, g => pct(g.acc)], ["ratio", "Коэф.", g => g.ratio, g => r2(g.ratio)], ["shots", avg ? "Выстр. / игра" : "Выстрелов", g => avg ? g.shots / g.games : g.shots, g => fmt(avg ? g.shots / g.games : g.shots)], ["players", "Игроков", g => g.players.length, g => g.players.length]];
  const list0 = S.guns.filter(g => ST.gunCls === "all" || g.cls === ST.gunCls);
  const sk = cols.find(c => c[0] === ST.gunSort.k) || cols[1], dir = ST.gunSort.dir;
  const list = ST.gunSort.k === "name" ? sortBy(list0, g => g.name, dir) : sortBy(list0, sk[2], dir);
  const mx = Math.max(1e-9, ...list0.map(sk[2]));
  const mxd = Math.max(...list0.map(cols[1][2]));
  const rowPh = (g, i) => `<a class="row${g === open ? " me" : ""}" href="${g === open ? "#guns" : gunHref(g)}" style="--c:${g === open ? "#fff" : "#444"};min-height:60px"><span class="grow" style="min-width:0"><span class="nm ell" style="display:block">${esc(g.name)}</span><span class="sub">${plural(g.games, ["игра", "игры", "игр"])}${g.cls === "pistol" ? " · пистолет" : ""}</span></span><span style="width:120px"><span class="fxb"><span class="big" style="font-size:18px">${sk[0] === "acc" || sk[0] === "ratio" ? cols[1][3](g) : sk[3](g)}</span>${gunImg(g.name, 18)}</span>${bar((sk[0] === "acc" || sk[0] === "ratio" ? cols[1][2](g) / mxd : sk[2](g) / mx))}</span><span class="N r small" style="width:50px">${pct(g.acc)}</span><span class="N r small" style="width:40px">${r2(g.ratio)}</span></a>`;
  const phone = `<div class="thd"><span class="grow"><button data-a="gunSort" data-v="name">Пушка${arrow(ST.gunSort.k === "name", dir)}</button></span><span style="width:120px"><button class="${["dealt", "games", "shots", "players"].includes(sk[0]) ? "on" : ""}" data-a="gunSort" data-v="dealt">${cols[1][1]}${arrow(sk[0] === "dealt", dir)}</button></span><span style="width:50px;text-align:right"><button class="${sk[0] === "acc" ? "on" : ""}" data-a="gunSort" data-v="acc">Точн.${arrow(sk[0] === "acc", dir)}</button></span><span style="width:40px;text-align:right"><button class="${sk[0] === "ratio" ? "on" : ""}" data-a="gunSort" data-v="ratio">Коэф.${arrow(sk[0] === "ratio", dir)}</button></span></div>${list.map(rowPh).join("")}`;
  const desk = `<table class="tbl"><thead><tr><th class="c">#</th><th></th><th class="l"><button data-a="gunSort" data-v="name">Пушка${arrow(ST.gunSort.k === "name", dir)}</button></th><th class="l">Класс</th>${cols.map(c => `<th class="${sk[0] === c[0] ? "on" : ""}"><button data-a="gunSort" data-v="${c[0]}">${c[1]}${arrow(sk[0] === c[0], dir)}</button></th>`).join("")}<th></th></tr></thead><tbody>
    ${list.map((g, i) => `<tr class="lk${g === open ? " me" : ""}" data-href="${g === open ? "#guns" : gunHref(g)}"><td class="c st" style="font-size:15px">${i + 1}</td><td style="width:90px">${gunImg(g.name, 24)}</td><td class="l nmc"><a href="${gunHref(g)}">${esc(g.name)}</a>${Object.keys(g.aliases).length > 1 ? `<span class="sub"> (было ${Object.keys(g.aliases).map(cap).filter(n => n.toLowerCase() !== g.name.toLowerCase()).map(esc).join(", ")})</span>` : ""}</td><td class="l cls">${CLS1[g.cls]} · ${g.gen === 8 ? "журнал" : "7 пок."}</td>${cols.map(c => c[0] === sk[0] && c[0] !== "games" ? `<td><span class="barc">${bar(c[2](g) / mx)}<span>${c[3](g)}</span></span></td>` : `<td>${c[3](g)}</td>`).join("")}<td class="chev">›</td></tr>`).join("")}</tbody></table>`;
  const sc = scatter(S.guns.filter(g => g.games >= 1).map(g => ({ x: g.acc, y: g.ratio, l: [...S.guns].sort((a, b) => b.dealt - a.dealt).slice(0, 5).includes(g) || g.cls === "pistol" ? g.name : "", r: 5 + 14 * Math.sqrt(g.dealt / Math.max(...S.guns.map(z => z.dealt))), href: gunHref(g), tip: `${g.name}: точность ${pct(g.acc)}, коэф. ${r2(g.ratio)}, попаданий ${g.dealt}` })), "точность", "коэф.", 380, 260, v => pct(v), r2, { hline: 1 });
  const top = (f, filt = () => true) => { const l = S.guns.filter(g => filt(g) && isFinite(f(g))); return l.length ? l.reduce((a, b) => f(b) > f(a) ? b : a) : null; };
  const many = g => g.games >= 2, ra = top(g => g.dealt / g.games, many), rb = top(g => g.ratio, many), rc = top(g => g.acc, many), rd = top(g => g.players.length);
  const units = GL.flatMap(x => x.m.P.flatMap(gunUnits).map(p => ({ p, x, g: gunOfKey(p.gkey) })));
  const bh = units.reduce((a, b) => b.p.dealt > a.p.dealt ? b : a), ba = units.filter(u => u.p.shots && !(u.p.e && u.p.e.acc)).reduce((a, b) => b.p.acc > a.p.acc ? b : a);
  const recT = (lab, g, v) => g ? `<a class="gkc" href="${gunHref(g)}"><div class="cap">${lab}</div><div class="fx gap10" style="margin-top:6px"><b class="A" style="font-size:28px">${v}</b><span class="small">${esc(g.name)}</span></div>${gunImg(g.name, 22)}</a>` : "";
  const recU = (lab, u, v) => `<a class="gkc" href="#${u.x.key}"><div class="cap">${esc(u.g.name)} · ${lab}</div><div class="fx gap10" style="margin-top:6px">${pt(u.p.name, 34)}<b class="A" style="font-size:30px">${v}</b><span class="xs st">${esc(u.p.name)} · ${dd(u.x.date)}</span></div></a>`;
  const card = open ? gunCard(open) : "";
  return `<section class="hero">${ptopLogo(`<span class="O xs st">${plural(S.guns.length, ["пушка", "пушки", "пушек"])}</span>`)}<div class="ghost dt" style="left:3%;top:150px;font-size:300px">${esc(open ? open.name : "Арсенал")}</div>
    <div class="hin gunshero"><div class="${open ? "dt" : ""}"><div class="kick u"><span class="tag"><span>Пушки</span></span><span>${plural(S.guns.length, ["пушка", "пушки", "пушек"])} · попадания за сезон</span></div><div class="A title il">Пушки</div>
      <div class="facts u d2"><div class="fact"><div class="v">${fmt(hits)}</div><div class="k">попаданий</div></div><div class="fact"><div class="v">${pct(div(hits, shots))}</div><div class="k">точность сезона</div></div>${P.games ? `<div class="fact"><div class="v">${pct(P.acc)}</div><div class="k">пистолет</div></div>` : ""}</div></div>
      ${card}</div></section>
    <div class="below"><div class="gridm"><div class="col"><div>${sec(1, "Все пушки")}<div class="ctrl">${seg(ST.gunMode, "gunMode", [["avg", "Среднее"], ["tot", "Всего"]])}<span class="sp"></span>${seg(ST.gunCls, "gunCls", [["all", "Все"], ["auto", "Авт."], ["pistol", "Пист."]])}</div><div class="ph">${phone}</div><div class="dt">${desk}</div><p class="note">Тагер узнаётся по адресу Bluetooth, поэтому переименования не разбивают статистику. Цифры зависят и от пушки, и от того, кто с ней играл.</p></div></div>
    <div class="col"><div class="pn">${sec(2, "Точность × коэф.")}${sc}<p class="note">Круг = попадания. Пунктир — коэф. 1.</p></div>
      ${P.games ? `<div class="pn">${sec(3, "Автоматы vs пистолет")}<div class="fx gap14">${ring(Math.min(1, P.acc / .3), pct(P.acc))}<p class="small mu"><b class="wh">Пистолет</b> — 5 жизней и одиночные выстрелы, поэтому сравнивается отдельно. Автоматы вместе: точность ${pct(Au.acc)}, коэф. ${r2(Au.ratio)}; пистолет: коэф. ${r2(P.ratio)}.</p></div></div>` : ""}
      <div>${sec(4, "Рекорды пушек")}<div class="grid2 gk" style="gap:8px">${recU("попаданий за игру", bh, bh.p.dealt)}${recU("точность за игру", ba, pct(ba.p.acc))}${recT("Главный калибр · за игру", ra, ra && onePt(ra.dealt / ra.games))}${recT("Убойная · коэф.", rb, rb && r2(rb.ratio))}${recT("Снайперская · точность", rc, rc && pct(rc.acc))}${recT("Переходящее знамя · игроков", rd, rd && rd.players.length)}</div><p class="note">Главный калибр, убойная и снайперская — среди пушек с 2+ играми.</p></div></div></div></div>`;
}
function gunCard(g) {
  const games = [...gunGames(g)].reverse();
  const players = sortBy(g.players, ({ dealt: r => r.dealt, games: r => r.games, ratio: r => r.ratio, acc: r => r.acc })[ST.gpSort.k] || (r => r.dealt), ST.gpSort.dir);
  const best = games.reduce((a, b) => b.p.dealt > a.p.dealt ? b : a, games[0]);
  const alias = Object.keys(g.aliases).map(cap).filter(n => n.toLowerCase() !== g.name.toLowerCase());
  const h = (k, l) => `<button class="${ST.gpSort.k === k ? "on" : ""}" data-a="gpSort" data-v="${k}">${l}${arrow(ST.gpSort.k === k, ST.gpSort.dir)}</button>`;
  return `<div class="guncard pn u"><div class="fxb"><div class="fx gap10"><span class="tag"><span>Открыта</span></span><span class="O xs">${CLS1[g.cls]} · ${g.games} игр из ${GL.length}</span></div><a class="pbtn" href="#guns">✕ Закрыть</a></div>
    <div class="gcg"><div><div class="A" style="font-size:64px;margin-top:8px">${esc(g.name)}</div>${alias.length ? `<div class="xs st">в журналах и как ${alias.map(esc).join(", ")}</div>` : ""}
      ${gunArtId(g.name) ? gunImg(g.name, 150, "gi") : `<div class="gunph">${esc(g.name)}</div>`}
      <div class="facts"><div class="fact"><div class="v">${fmt(g.dealt)}</div><div class="k">попаданий</div></div><div class="fact"><div class="v">${pct(g.acc)}</div><div class="k">точность</div></div><div class="fact"><div class="v">${r2(g.ratio)}</div><div class="k">коэф.</div></div><div class="fact"><div class="v">${g.games}</div><div class="k">игр</div></div></div></div>
      <div><div class="cap" style="margin:10px 0 4px">попаданий по играм${best ? ` · рекорд ${best.p.dealt} (${dd(best.date)})` : ""}</div><div class="gbars">${vbars(games.map(x => ({ lab: dd(x.date), sub: x.p.name, v: x.p.dealt, href: "#" + x.key, c: x === best ? "#d8d8d8" : "#6a6a6a", tip: `${dd(x.date)} · ${x.p.name}: ${x.p.dealt}` })), 380, 150)}</div>
      <div class="cap" style="margin:12px 0 4px">кто играл</div><div class="thd" style="padding-left:0"><span class="grow">игрок</span><span style="width:40px" class="r">${h("games", "игр")}</span><span style="width:56px" class="r">${h("dealt", "попал")}</span><span style="width:48px" class="r">${h("ratio", "коэф.")}</span><span style="width:54px" class="r">${h("acc", "точн.")}</span></div>
      ${players.map(r => `<a class="fx gap10" style="min-height:44px" href="${plHref(r.name)}">${pt(r.name, 32)}<b class="grow ell">${esc(r.name)}</b><span class="N r" style="width:40px">${r.games}</span><span class="N r" style="width:56px">${fmt(r.dealt)}</span><span class="N r" style="width:48px">${r2(r.ratio)}</span><span class="N r" style="width:54px">${pct(r.acc)}</span></a>`).join("")}</div></div></div>`;
}
