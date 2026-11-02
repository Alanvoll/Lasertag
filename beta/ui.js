// Общие помощники интерфейса: арт, иконки, графики (inline SVG), производные данные сезона.
"use strict";
const SHOW_CHAR_ART = true; // false — вместо арта персонажей монограммы
const ART_ALL = { "Арсений": "arseniy", "Женя": "zhenya", "Данила": "danila", "Петя": "petya", "Артур": "artur", "Миша": "misha", "Кобра": "kobra", "Олег": "oleg", "Глеб": "gleb", "Андрей": "andrey", "Антон": "anton", "Никита": "nikita", "Святослав": "svyatoslav" };
const ART_IDS = SHOW_CHAR_ART ? ART_ALL : {};
const GUN_ART = { "винторез": "vintorez", "p90": "p90", "ar15": "ar15", "хищник": "ak", "акашка": "ak", "пистолет": "pistol", "скорпион": "scorpion" };
const TL = { 0: "К", 1: "С", 2: "Ж", 3: "З" };
const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
const slug = s => String(s).toLowerCase().split("").map(c => TR[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const tc = t => TEAMS[t] ? TEAMS[t].c : "#888";
const tname = t => TEAMS[t] ? TEAMS[t].name : "?";
const tgen = t => tname(t).toLowerCase().replace(/ые$/, "ых").replace(/ие$/, "их");
const dd = d => dateShort(d).slice(0, 5);
const num = (v, f) => isFinite(v) ? f(v) : "∞";
const onePt = x => isFinite(x) ? x.toFixed(1).replace(".", ",") : "∞";

// ---------- арт ----------
const mono = name => { const m = String(name).match(/^(\S)\S*(?:\s+(\d+))?/); return m ? m[1] + (m[2] ? `<small>${m[2]}</small>` : "") : "?"; };
function pt(name, size = 40, sc = "", cls = "") {
  const id = ART_IDS[name];
  return `<span class="pt ${cls}" style="width:${size}px;height:${size}px;${sc ? `--sc:${sc};` : ""}">${id ? `<img src="art/icon/${id}.png" alt="" loading="lazy">` : `<span class="ini" style="font-size:${Math.round(size * .55)}px">${mono(name)}</span>`}</span>`;
}
function fig(name, style = "", cls = "") {
  const id = ART_IDS[name];
  if (id) return `<img class="art ${cls}" src="art/${id}.png" alt="" style="${style}">`;
  const m = String(name).match(/^(\S)\S*(?:\s+(\d+))?/);
  return `<div class="mono ${cls}" style="${style};transform:translateX(-50%)"><span>${m ? m[1] + (m[2] || "") : "?"}</span></div>`;
}
const gunArtId = name => GUN_ART[String(name || "").toLowerCase()] || null;
const gunImg = (name, h = 28, cls = "gunimg") => { const id = gunArtId(name); return id ? `<img class="${cls}" src="art/gun/${id}.png" alt="" style="height:${h}px">` : ""; };
const tmk = (t, sm) => `<span class="tm${sm ? " sm" : ""}" style="--c:${tc(t)}">${TL[t] ?? "?"}</span>`;

// ---------- иконки ----------
const IC = {
  crown: '<path d="M3 17h14M3 14l-1-8 5 4 3-6 3 6 5-4-1 8z"/>',
  bolt: '<path d="M11 1L4 11h5l-1 8 7-10h-5z"/>',
  target: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><path d="M10 0v4M10 16v4M0 10h4M16 10h4"/>',
  miss: '<circle cx="10" cy="10" r="7"/><path d="M5 5l10 10"/>',
  swap: '<path d="M3 7h13l-3-3M17 13H4l3 3"/>',
  layers: '<path d="M10 3l8 4-8 4-8-4zM2 11l8 4 8-4"/>',
  shield: '<path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z"/><path d="M7 10l2 2 4-4"/>',
  flag: '<path d="M4 19V2M4 3h11l-2 4 2 4H4"/>',
  skull: '<path d="M10 2c4 0 7 3 7 7 0 2-1 3-2 4v3H5v-3c-1-1-2-2-2-4 0-4 3-7 7-7z"/><circle cx="7.5" cy="9" r="1.5"/><circle cx="12.5" cy="9" r="1.5"/>',
  wall: '<rect x="2" y="3" width="16" height="14"/><path d="M2 8h16M2 12h16M8 3v5M12 8v4M8 12v5"/>',
  eye: '<path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><path d="M3 17L17 3"/>',
  ammo: '<path d="M5 18V8l2-5 2 5v10zM11 18V8l2-5 2 5v10z"/>',
  leaf: '<path d="M4 16C4 8 9 4 17 3c0 8-4 13-12 13zM4 16l7-7"/>',
  swords: '<path d="M3 3l10 10M17 3L7 13M12 15l3 3M8 15l-3 3"/>',
  star: '<path d="M10 2l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z"/>',
  key: '<circle cx="6" cy="10" r="3.5"/><path d="M9.5 10H18M15 10v3M17 10v2"/>',
  gun: '<path d="M1 6h17v3h-6l-1.5 2.5H8L7 17H3.5l1-5.5H1z"/>',
  chart: '<path d="M3 17V10M8 17V4M13 17V8M18 17V2"/>',
  help: '<circle cx="10" cy="10" r="8"/><path d="M7.5 7.5a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M10 14.5v.5"/>',
  compare: '<rect x="2" y="3" width="7" height="14"/><rect x="11" y="3" width="7" height="14"/>',
  play: '<path d="M5 3l12 7-12 7z"/>',
};
const icon = (k, cls = "ico") => `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true">${IC[k] || IC.star}</svg>`;
const NOM_ICON = { MVP: "crown", "Терминатор": "bolt", "Спонсор патронного завода": "ammo", "Бережливый": "leaf", "Белке в глаз": "target", "Штурмовик Империи": "miss", "Джон Уик": "swap",
  "Живой щит": "wall", "Невидимка": "eye", "Кенни": "skull", "Горец": "shield", "Последний герой": "flag", "Коллекционер MVP": "layers", "Охота открыта": "swords" };
const LOGO = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="8.2" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M13 0v6" stroke="#ff4d4f" stroke-width="2.6"/><path d="M26 13h-6" stroke="#f2c230" stroke-width="2.6"/><path d="M13 26v-6" stroke="#2fc27a" stroke-width="2.6"/><path d="M0 13h6" stroke="#3d8bff" stroke-width="2.6"/><circle cx="13" cy="13" r="2.2" fill="#fff"/></svg>`;
const NAVIC = {
  season: '<svg width="20" height="20" viewBox="0 0 20 20"><path d="M3 17V10M8 17V4M13 17V8M18 17V2" stroke="currentColor" stroke-width="2.6"/></svg>',
  games: '<svg width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="4" fill="currentColor"/><rect x="2" y="9" width="16" height="3" fill="currentColor" opacity=".7"/><rect x="2" y="14" width="16" height="3" fill="currentColor" opacity=".45"/></svg>',
  players: '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="currentColor"/><path d="M2 19c0-5 3.5-8 8-8s8 3 8 8z" fill="currentColor"/></svg>',
  guns: '<svg width="22" height="20" viewBox="0 0 22 20"><path d="M1 6h19v3h-7l-1.5 2.5H9L8 18H4l1.2-6.5H1z" fill="currentColor"/></svg>',
};
const BACK = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke-width="2"><path d="M11 3L5 9l6 6"/></svg>`;

// ---------- разметка ----------
const sec = (n, title, link = "", extra = "") => `<div class="sec">${n ? `<span class="num">${String(n).padStart(2, "0")}</span>` : ""}<h3>${title}</h3><span class="ln"></span>${extra}${link}</div>`;
const chip = (on, act, v, label, cls = "") => `<button class="chip ${cls}${on ? " on" : ""}" data-a="${act}" data-v="${esc(v)}" aria-pressed="${on}">${label}</button>`;
const seg = (cur, act, opts, cls = "") => `<div class="seg">${opts.map(([v, l]) => chip(String(cur) === String(v), act, v, l, cls)).join("")}</div>`;
const bar = (frac, c = "#fff", delay = 0) => `<span class="bt"><i style="width:${Math.max(0, Math.min(1, frac || 0)) * 100}%;--c:${c};animation-delay:${delay}s"></i></span>`;
const vsbar = (a, b, ca, cb) => { const t = a + b || 1; return `<span class="vsb"><i style="flex:${a / t};--c:${ca}"></i><i style="flex:${b / t};--c:${cb}"></i></span>`; };
const ghost = (word, style) => `<div class="ghost" style="${style}">${esc(word)}</div>`;
const arrow = (on, dir) => on ? (dir < 0 ? " ▼" : " ▲") : "";

// ---------- графики ----------
// Радар: оси [{l, s}], серии [{v:[0..100], c, w}]
function radar(axes, series, W = 300, H = 260, R = 92) {
  const n = axes.length, cx = W / 2, cy = H / 2 + 4;
  const P = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const poly = r => axes.map((_, i) => P(i, r).map(x => x.toFixed(1)).join(",")).join(" ");
  let s = `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Радар">`;
  [.25, .5, .75, 1].forEach(k => s += `<polygon class="gl" points="${poly(R * k)}"/>`);
  axes.forEach((_, i) => { const [x, y] = P(i, R); s += `<line class="gl" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; });
  series.forEach((sr, k) => {
    const pts = sr.v.map((v, i) => P(i, R * Math.max(0, Math.min(100, v || 0)) / 100));
    s += `<g class="rdp" style="animation-delay:${.15 + k * .2}s"><polygon points="${pts.map(p => p.map(x => x.toFixed(1)).join(",")).join(" ")}" fill="${sr.c}" fill-opacity="${sr.fo ?? .22}" stroke="${sr.c}" stroke-width="2"/>${pts.map(([x, y]) => `<rect x="${(x - 3).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="6" height="6" fill="${sr.c}"/>`).join("")}</g>`;
  });
  axes.forEach((a, i) => {
    const [x, y] = P(i, R + 16), anc = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
    const dy = y < cy - R * .5 ? -6 : y > cy + R * .5 ? 10 : 0;
    s += `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anc}" style="fill:#ddd;text-transform:uppercase">${esc(a.l)}</text>`;
    if (a.s) s += `<text x="${x.toFixed(1)}" y="${(y + dy + 13).toFixed(1)}" text-anchor="${anc}" style="fill:#fff;font-weight:600">${esc(a.s)}</text>`;
  });
  return s + `</svg>`;
}
// Линия по играм: pts [{lab, v, avg, mark, tip}] ; better: 1/-1/0
function lineChart(pts, show, W = 340, H = 170, opts = {}) {
  const L = 30, Rr = 14, T = 22, B = 26;
  if (!pts.length) return "";
  const vals = pts.flatMap(p => [p.v, p.avg]).filter(isFinite);
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo || hi || 1) * .18; lo = Math.max(0, lo - pad); hi += pad;
  const x = i => L + (pts.length === 1 ? (W - L - Rr) / 2 : i * (W - L - Rr) / (pts.length - 1));
  const y = v => T + (H - T - B) * (1 - (Math.min(v, hi) - lo) / (hi - lo || 1));
  const path = get => { let d = "", pen = false; pts.forEach((p, i) => { const v = get(p); if (!isFinite(v)) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`; pen = true; }); return d; };
  let s = `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "график")}">`;
  [0, .5, 1].forEach(k => { const yy = T + (H - T - B) * k; s += `<line class="gl" x1="${L}" x2="${W - Rr}" y1="${yy}" y2="${yy}"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end" style="font-size:10px">${esc(show(hi - (hi - lo) * k))}</text>`; });
  const me = pts.map((p, i) => isFinite(p.v) ? [x(i), y(p.v)] : null).filter(Boolean);
  if (me.length > 1) s += `<path d="M${me[0][0].toFixed(1)} ${H - B}${me.map(([a, b]) => `L${a.toFixed(1)} ${b.toFixed(1)}`).join("")}L${me[me.length - 1][0].toFixed(1)} ${H - B}Z" fill="url(#lgr)" opacity=".5"/>`;
  s += `<defs><linearGradient id="lgr" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
  s += `<path class="gld" d="${path(p => p.avg)}"/>`;
  s += `<path class="drw" d="${path(p => p.v)}" fill="none" stroke="#fff" stroke-width="2.4"/>`;
  pts.forEach((p, i) => {
    s += `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" style="font-size:10px">${esc(p.lab)}</text>`;
    if (!isFinite(p.v)) return;
    const X = x(i), Y = y(p.v);
    s += p.mark ? `<rect class="pp" x="${X - 6}" y="${Y - 6}" width="12" height="12" transform="rotate(45 ${X} ${Y})" fill="#fff" style="animation-delay:${.3 + i * .07}s"/>`
      : `<rect class="pp" x="${X - 5}" y="${Y - 5}" width="10" height="10" transform="rotate(45 ${X} ${Y})" fill="#0b0b0b" stroke="#fff" stroke-width="2" style="animation-delay:${.3 + i * .07}s"/>`;
    s += `<text x="${X.toFixed(1)}" y="${(Y - 11).toFixed(1)}" text-anchor="middle" style="fill:#fff;font-size:12px;font-weight:600">${esc(show(p.v))}</text>`;
    if (p.href) s += `<a href="${p.href}"><rect x="${X - 16}" y="${T - 10}" width="32" height="${H - T - B + 20}" fill="transparent"><title>${esc(p.tip || "")}</title></rect></a>`;
  });
  return s + `</svg>`;
}
// Ход игры: разница a − b после каждого раунда + столбики победителей
function flowChart(m, a, b, W = 360, H = 190) {
  const w = m.winners, n = w.length; if (!n) return "";
  const L = 22, Rr = 40, T = 14, mid = 100;
  let d = 0; const diff = w.map(x => x === null ? null : (d += x === a ? 1 : x === b ? -1 : 0));
  const mx = Math.max(3, ...diff.filter(v => v !== null).map(Math.abs));
  const x = i => L + (i + .5) * (W - L - Rr) / n, y = v => T + (mid - T - 8) / 2 * (1 - v / mx);
  const y0 = y(0);
  let s = `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ход игры по раундам">`;
  s += `<line class="gl" x1="${L}" x2="${W - Rr}" y1="${y0}" y2="${y0}"/><text x="${L - 4}" y="${y0 + 4}" text-anchor="end">0</text>`;
  s += `<text x="${L - 4}" y="${y(mx) + 4}" text-anchor="end">+${mx}</text><text x="${L - 4}" y="${y(-mx) + 4}" text-anchor="end">−${mx}</text>`;
  let path = "", pen = false, prevY = y0;
  diff.forEach((v, i) => { const x0 = L + i * (W - L - Rr) / n, x1 = L + (i + 1) * (W - L - Rr) / n; if (v === null) { pen = false; return; } const yy = y(v); path += pen ? `L${x0.toFixed(1)} ${yy.toFixed(1)}L${x1.toFixed(1)} ${yy.toFixed(1)}` : `M${x0.toFixed(1)} ${(i ? yy : y0).toFixed(1)}L${x0.toFixed(1)} ${yy.toFixed(1)}L${x1.toFixed(1)} ${yy.toFixed(1)}`; pen = true; prevY = yy; });
  s += `<path class="drw" d="${path}" fill="none" stroke="${tc(a)}" stroke-width="2.4"/>`;
  const last = diff.filter(v => v !== null).pop() ?? 0;
  const cnt = t => w.filter(z => z === t).length;
  s += `<text x="${W - Rr + 4}" y="${y(last) + 4}" style="fill:#fff;font-size:13px;font-weight:600">${cnt(a)}:${cnt(b)}</text>`;
  // столбики
  const yb = mid + 18, bh = 18;
  s += `<text x="${L - 4}" y="${yb - 3}" text-anchor="end" style="fill:${tc(a)}">${TL[a]}</text><text x="${L - 4}" y="${yb + bh + 12}" text-anchor="end" style="fill:${tc(b)}">${TL[b]}</text>`;
  w.forEach((t, i) => {
    const bw = Math.max(2, (W - L - Rr) / n * .62), xx = x(i) - bw / 2;
    if (t === a) s += `<rect class="gy" x="${xx.toFixed(1)}" y="${yb - bh}" width="${bw.toFixed(1)}" height="${bh}" fill="${tc(a)}" style="animation-delay:${(i * .02).toFixed(2)}s"/>`;
    else if (t === b) s += `<rect class="gyt" x="${xx.toFixed(1)}" y="${yb + 2}" width="${bw.toFixed(1)}" height="${bh}" fill="${tc(b)}" style="animation-delay:${(i * .02).toFixed(2)}s"/>`;
    else s += `<rect x="${xx.toFixed(1)}" y="${yb - bh}" width="${bw.toFixed(1)}" height="${bh * 2 + 2}" fill="none" stroke="#777" stroke-dasharray="2 2"/>`;
  });
  m.swaps.forEach(r => { const xx = L + r * (W - L - Rr) / n; s += `<line x1="${xx}" x2="${xx}" y1="${T}" y2="${yb + bh + 4}" stroke="#fff" stroke-dasharray="3 3" opacity=".5"/>`; });
  const step = n > 24 ? 5 : n > 12 ? 5 : 2;
  for (let i = 0; i < n; i++) if (i === 0 || (i + 1) % step === 0) s += `<text x="${x(i).toFixed(1)}" y="${H - 4}" text-anchor="middle">${i + 1}</text>`;
  return s + `</svg>`;
}
// Мини-ход игры для строк списка
function sparkFlow(m, a, b, W = 150, H = 40) {
  const w = m.winners; if (!w.length) return "";
  let d = 0; const diff = w.map(x => x === null ? null : (d += x === a ? 1 : x === b ? -1 : 0));
  const mx = Math.max(2, ...diff.filter(v => v !== null).map(Math.abs));
  const x = i => 2 + i * (W - 4) / Math.max(1, w.length - 1), y = v => H / 2 - (H / 2 - 3) * v / mx;
  let p = "", pen = false; diff.forEach((v, i) => { if (v === null) { pen = false; return; } p += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`; pen = true; });
  return `<svg class="ch" viewBox="0 0 ${W} ${H}" style="width:${W}px" aria-hidden="true"><line class="gld" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/><path class="drw" d="${p}" fill="none" stroke="#fff" stroke-width="1.6"/></svg>`;
}
// Точечный график: [{x,y,l,c,href,big}]
function scatter(pts, xl, yl, W = 360, H = 240, fx = onePt, fy = onePt, opts = {}) {
  const L = 34, Rr = 14, T = 16, B = 30;
  const xs = pts.map(p => p.x).filter(isFinite), ys = pts.map(p => p.y).filter(isFinite);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (opts.diag) { x0 = y0 = Math.min(x0, y0); x1 = y1 = Math.max(x1, y1); }
  const px = (x1 - x0 || 1) * .1, py = (y1 - y0 || 1) * .12; x0 -= px; x1 += px; y0 -= py; y1 += py;
  const X = v => L + (W - L - Rr) * (v - x0) / (x1 - x0), Y = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
  let s = `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(xl)} и ${esc(yl)}">`;
  for (let k = 0; k <= 3; k++) { const vx = x0 + (x1 - x0) * (k + .5) / 4, vy = y0 + (y1 - y0) * (k + .5) / 4;
    s += `<line class="gl" x1="${X(vx)}" x2="${X(vx)}" y1="${T}" y2="${H - B}"/><text x="${X(vx)}" y="${H - B + 14}" text-anchor="middle" style="font-size:10px">${fx(vx)}</text>`;
    s += `<line class="gl" x1="${L}" x2="${W - Rr}" y1="${Y(vy)}" y2="${Y(vy)}"/><text x="${L - 4}" y="${Y(vy) + 3}" text-anchor="end" style="font-size:10px">${fy(vy)}</text>`; }
  if (opts.diag) s += `<line class="gld" x1="${X(x0)}" y1="${Y(x0)}" x2="${X(x1)}" y2="${Y(x1)}"/><text x="${X(x1) - 4}" y="${Y(x1) + 14}" text-anchor="end" style="font-size:10px">коэф. 1</text>`;
  if (opts.hline != null) s += `<line class="gld" x1="${L}" x2="${W - Rr}" y1="${Y(opts.hline)}" y2="${Y(opts.hline)}"/>`;
  s += `<text x="${W - Rr}" y="${H - 2}" text-anchor="end" style="font-size:10px">${esc(xl)} →</text><text x="${L}" y="${T - 4}" style="font-size:10px">↑ ${esc(yl)}</text>`;
  pts.forEach((p, i) => {
    if (!isFinite(p.x) || !isFinite(p.y)) return;
    const cx = X(p.x), cy = Y(p.y), r = p.r || (p.big ? 6 : 4);
    const shape = p.r ? `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width="1.2"/>`
      : `<rect x="${(cx - r).toFixed(1)}" y="${(cy - r).toFixed(1)}" width="${r * 2}" height="${r * 2}" transform="rotate(45 ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="${p.c || "#fff"}" ${p.big ? "" : 'opacity=".8"'}/>`;
    const lab = p.l ? `<text x="${(cx + r + 3).toFixed(1)}" y="${(cy + 4).toFixed(1)}" class="lb" style="fill:${p.big ? "#fff" : "#aaa"}">${esc(p.l)}</text>` : "";
    const g = `<g class="pp" style="animation-delay:${(.2 + i * .03).toFixed(2)}s">${shape}${lab}<title>${esc(p.tip || p.l || "")}</title></g>`;
    s += p.href ? `<a href="${p.href}">${g}</a>` : g;
  });
  return s + `</svg>`;
}
function ring(frac, label, W = 84) {
  const r = W / 2 - 6, c = 2 * Math.PI * r;
  return `<svg class="ring" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" aria-hidden="true"><circle cx="${W / 2}" cy="${W / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/><circle cx="${W / 2}" cy="${W / 2}" r="${r}" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${W / 2} ${W / 2})" style="animation:draw 1.2s both"/><text x="50%" y="54%" text-anchor="middle" style="fill:#fff;font:600 15px Oswald">${esc(label)}</text></svg>`;
}
// Столбики по играм: [{lab, a, b, ca, cb, href, note}] (a вверх, b вниз)
function duoBars(items, W = 360, H = 190) {
  const L = 8, Rr = 8, mid = 92, n = items.length;
  const mx = Math.max(1, ...items.flatMap(i => [i.a, i.b]));
  const cw = (W - L - Rr) / n, bw = Math.min(36, cw * .55), k = (mid - 26) / mx;
  let s = `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Раунды по играм"><line class="gl" x1="${L}" x2="${W - Rr}" y1="${mid}" y2="${mid}"/>`;
  items.forEach((it, i) => {
    const cx = L + cw * (i + .5), x = cx - bw / 2;
    const g = `<g><rect class="gy" x="${x.toFixed(1)}" y="${(mid - it.a * k).toFixed(1)}" width="${bw.toFixed(1)}" height="${(it.a * k).toFixed(1)}" fill="${it.ca}" style="animation-delay:${i * .07}s"${it.hatch ? ' fill-opacity=".55"' : ""}/>
      <rect class="gyt" x="${x.toFixed(1)}" y="${mid + 2}" width="${bw.toFixed(1)}" height="${(it.b * k).toFixed(1)}" fill="${it.cb}" style="animation-delay:${i * .07 + .1}s"/>
      <text x="${cx.toFixed(1)}" y="${(mid - it.a * k - 6).toFixed(1)}" text-anchor="middle" style="fill:#fff;font-size:12px;font-weight:600">${it.a}</text>
      <text x="${cx.toFixed(1)}" y="${(mid + it.b * k + 16).toFixed(1)}" text-anchor="middle" style="font-size:11px">${it.b}</text>
      <text x="${cx.toFixed(1)}" y="${H - 4}" text-anchor="middle" style="font-size:10px">${esc(it.lab)}${it.note || ""}</text>
      <rect x="${(cx - cw / 2).toFixed(1)}" y="0" width="${cw.toFixed(1)}" height="${H}" fill="transparent"><title>${esc(it.tip || "")}</title></rect></g>`;
    s += it.href ? `<a href="${it.href}">${g}</a>` : g;
  });
  return s + `</svg>`;
}
function vbars(items, W = 360, H = 150, show = String) { // [{lab, v, href}]
  const n = items.length, L = 6, cw = (W - L * 2) / n, bw = Math.min(40, cw * .55), mx = Math.max(1e-9, ...items.map(i => i.v)), base = H - 34;
  let s = `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Столбики">`;
  items.forEach((it, i) => { const cx = L + cw * (i + .5), h = (base - 18) * it.v / mx;
    const g = `<rect class="gy" x="${(cx - bw / 2).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${it.c || "rgba(255,255,255,.8)"}" style="animation-delay:${i * .06}s"/><text x="${cx.toFixed(1)}" y="${(base - h - 5).toFixed(1)}" text-anchor="middle" style="fill:#fff;font-size:12px;font-weight:600">${esc(show(it.v))}</text><text x="${cx.toFixed(1)}" y="${H - 16}" text-anchor="middle" style="font-size:10px">${esc(it.lab)}</text>${it.sub ? `<text x="${cx.toFixed(1)}" y="${H - 3}" text-anchor="middle" style="font-size:9px;fill:#777">${esc(it.sub)}</text>` : ""}<rect x="${(cx - cw / 2).toFixed(1)}" y="0" width="${cw.toFixed(1)}" height="${H}" fill="transparent"><title>${esc(it.tip || "")}</title></rect>`;
    s += it.href ? `<a href="${it.href}">${g}</a>` : `<g>${g}</g>`; });
  return s + `</svg>`;
}
