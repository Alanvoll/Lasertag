// ---------- эффекты зрелищности: живой фон, появление, наклон карточек, выход команд, рост полос, переходы, бегущая строка ----------
(() => {
  const FX = [
    ["bg", "Живой фон", "Точечная сетка: светлеет под курсором, по ней проходит волна света"],
    ["intro", "Появление и блик", "Заголовки выезжают по словам, по белым плашкам пробегает блик"],
    ["tilt", "3D-наклон карточек", "Карточки игр, номинаций и дуэлей наклоняются к курсору"],
    ["versus", "Выход команд", "На странице игры команды выезжают с боков, ромб VS и штамп «Победа»"],
    ["grow", "Полосы и раунды", "Полосы растут, раунды выкладываются по одному, графики прорисовываются"],
    ["wipe", "Переходы страниц", "Плавная смена страниц и линия загрузки сверху"],
    ["ticker", "Бегущая строка", "Результаты всех игр под шапкой, как в трансляции"],
  ];
  const root = document.documentElement, calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let saved = {}; try { saved = JSON.parse(localStorage.getItem("lt-fx") || "{}"); } catch (e) {}
  const apply = () => FX.forEach(([k]) => root.toggleAttribute("data-fx-" + k, saved[k] !== false));
  apply();

  // --- панель (только в превью или по адресу с ?fx)
  if (root.hasAttribute("data-fx-panel") || new URLSearchParams(location.search).has("fx")) {
    const p = document.createElement("aside"); p.className = "fx-panel";
    p.innerHTML = `<header><span>Эффекты</span><span>—</span></header><div class="bd">${FX.map(([k, t, d]) =>
      `<label><input type="checkbox" data-k="${k}" ${saved[k] !== false ? "checked" : ""}><span>${t}<small>${d}</small></span></label>`).join("")}
      <div class="row"><button data-all="1">Все</button><button data-all="0">Ничего</button><button data-replay>Повторить</button></div></div>`;
    document.body.append(p);
    p.querySelector("header").onclick = () => { p.classList.toggle("min"); p.querySelector("header span:last-child").textContent = p.classList.contains("min") ? "+" : "—"; };
    const store = () => { localStorage.setItem("lt-fx", JSON.stringify(saved)); apply(); };
    p.addEventListener("change", e => { const k = e.target.dataset.k; if (k) { saved[k] = e.target.checked; store(); rerender(); } });
    p.addEventListener("click", e => {
      const a = e.target.dataset.all; if (a != null) { FX.forEach(([k]) => saved[k] = a === "1"); p.querySelectorAll("input").forEach(i => i.checked = a === "1"); store(); rerender(); }
      if (e.target.hasAttribute("data-replay")) rerender();
    });
  }
  const rerender = () => { if (typeof render === "function") render(); };
  const on = k => root.hasAttribute("data-fx-" + k);

  // --- 1. живой фон
  const cv = document.createElement("canvas"); cv.className = "fx-canvas"; cv.setAttribute("aria-hidden", "true");
  (document.querySelector(".fx") || document.body).after(cv);
  const ctx = cv.getContext("2d"); let W = 0, H = 0, dpr = 1, mx = -1e4, my = -1e4, sx = -1e4, sy = -1e4;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener("resize", size);
  addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener("pointerleave", () => { mx = my = -1e4; });
  const G = 30; let last = 0;
  const frame = t => {
    requestAnimationFrame(frame);
    if (!on("bg") || calm || document.hidden || t - last < 33) return; last = t;
    sx += (mx - sx) * .15; sy += (my - sy) * .15;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const off = (scrollY * .3) % G, wave = (t / 9000 % 1) * (W + H + 800) - 400;
    for (let y = -off; y < H + G; y += G) for (let x = G / 2; x < W; x += G) {
      const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy), near = Math.max(0, 1 - d / 220);
      const w = Math.max(0, 1 - Math.abs(x + y - wave) / 160);
      const a = .06 + near * .55 + w * .16, push = near * near * 10;
      const px = x + (d ? dx / d * push : 0), py = y + (d ? dy / d * push : 0);
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(px - .75 - near, py - .75 - near, 1.5 + near * 2, 1.5 + near * 2);
    }
  };
  requestAnimationFrame(frame);

  // --- 3. наклон
  const TILT = ".gcard, .nom, .duel";
  addEventListener("pointermove", e => {
    if (!on("tilt") || calm || e.pointerType === "touch") return;
    const el = e.target.closest && e.target.closest(TILT);
    document.querySelectorAll(".fx-tilting").forEach(x => x !== el && x.classList.remove("fx-tilting"));
    if (!el) return;
    const r = el.getBoundingClientRect(), kx = (e.clientX - r.left) / r.width - .5, ky = (e.clientY - r.top) / r.height - .5, m = el.matches(".gcard") ? 10 : 6;
    el.style.setProperty("--ry", (kx * m).toFixed(2) + "deg"); el.style.setProperty("--rx", (-ky * m).toFixed(2) + "deg"); el.classList.add("fx-tilting");
  }, { passive: true });

  // --- 6. переходы: клик по внутренней ссылке оборачиваем в View Transition
  const line = document.createElement("div"); line.className = "fx-line"; document.body.append(line);
  addEventListener("hashchange", () => { if (!on("wipe")) return; line.classList.remove("run"); void line.offsetWidth; line.classList.add("run"); });
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !on("wipe") || calm || !document.startViewTransition || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const h = a.getAttribute("href"); if (h === location.hash || h.length < 2) return;
    e.preventDefault();
    document.startViewTransition(() => new Promise(res => { addEventListener("hashchange", () => setTimeout(res, 0), { once: true }); location.hash = h; }));
  });

  // --- 7. бегущая строка
  let tickHtml = null, tickFor = -1;
  const tickerHtml = () => {
    if (tickFor === DATA.games.length) return tickHtml;
    tickFor = DATA.games.length;
    try {
      const S = season();
      const items = allGames().map(({ i, key, g }) => {
        const m = S.models[i], h = hitsOf(m), sc = scoreOf(m);
        const parts = h.map(([t, n]) => `<span class="sc" style="color:${TEAMS[t].c}">${n}</span>`).join('<span>:</span>');
        const rounds = sc.kind === "раунды" ? ` · раунды ${sc.parts.map(([t, n]) => `<b style="color:${TEAMS[t].c}">${n}</b>`).join(":")}` : "";
        return `<a class="it" href="#${key}"><b>${dateShort(g.date)}</b>${parts}<span>${rounds}</span>${m.mvp ? `<span>· MVP <b>${esc(m.mvp.name)}</b></span>` : ""}</a>`;
      }).join("");
      tickHtml = items ? `<div class="fx-ticker" aria-label="Результаты игр"><span class="lab">Результаты</span><div class="fx-ticker-wrap"><div class="run" style="--dur:${Math.max(30, DATA.games.length * 9)}s">${items}${items.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ')}</div></div></div>` : "";
    } catch (e) { tickHtml = ""; }
    return tickHtml;
  };

  // --- после каждой отрисовки страницы
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.replace("fx-wait", "fx-go"); io.unobserve(en.target); }
  }), { threshold: .15 }) : null;
  const decorate = () => {
    if (app.querySelector(".top") && !app.querySelector(".fx-ticker")) { const t = tickerHtml(); if (t) app.querySelector(".top").insertAdjacentHTML("afterend", t); }
    // заголовки по словам
    app.querySelectorAll("h1:not([data-fx])").forEach(h => {
      h.dataset.fx = "1"; let i = 0;
      [...h.childNodes].forEach(n => {
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return; if (/^\s+$/.test(w)) { frag.append(w); return; }
          const o = document.createElement("span"); o.className = "fx-w"; o.innerHTML = `<span style="--i:${i++}"></span>`; o.firstChild.textContent = w; frag.append(o);
        });
        n.replaceWith(frag);
      });
    });
    app.querySelectorAll(".facts .fact").forEach((f, i) => f.style.setProperty("--i", i));
    app.querySelectorAll(".hero, .gcard .date").forEach((el, i) => { if (!el.querySelector(":scope > .fx-sheen")) el.insertAdjacentHTML("beforeend", `<i class="fx-sheen" aria-hidden="true" style="--d:${(.6 + i * .35).toFixed(2)}s"></i>`); });
    // табло: VS и победитель
    const b = app.querySelector(".board");
    if (b && !b.querySelector(".fx-vs")) {
      const teams = b.querySelectorAll(":scope > .team");
      if (teams.length === 2) b.insertAdjacentHTML("beforeend", `<span class="fx-vs" aria-hidden="true"><b>VS</b></span>`);
      try {
        const key = location.hash.slice(1), x = allGames().find(z => z.key === key);
        if (x) {
          const m = season().models[x.i], sc = scoreOf(m), best = Math.max(...sc.parts.map(p => p[1]));
          const win = sc.parts.filter(p => p[1] === best);
          if (win.length === 1) { const idx = m.teamIds.indexOf(win[0][0]); const tn = teams[idx] && teams[idx].querySelector(".team-name"); if (tn) tn.insertAdjacentHTML("beforeend", `<span class="fx-win">Победа</span>`); }
        }
      } catch (e) {}
    }
    // полосы, раунды, графики
    app.querySelectorAll("table").forEach(t => t.querySelectorAll("tbody tr").forEach((r, i) => r.style.setProperty("--i", Math.min(i, 30))));
    app.querySelectorAll(".strip").forEach(s => [...s.children].forEach((c, i) => c.style.setProperty("--i", i)));
    app.querySelectorAll(".prow").forEach((r, i) => r.querySelectorAll(".ptrack i").forEach(x => x.style.setProperty("--i", Math.min(i, 20))));
    app.querySelectorAll("#app > section, .scroll, .frags, .prog").forEach(el => {
      if (el.matches("section") && el.querySelector(".scroll, .frags, .prog")) return;
      if (el.classList.contains("fx-go") || el.classList.contains("fx-wait")) return;
      if (!io || calm) return;
      el.classList.add("fx-wait"); io.observe(el);
    });
  };
  new MutationObserver(decorate).observe(app, { childList: true });
  // таблицы перерисовываются при сортировке — новые строки не ждут
  app.addEventListener("click", () => setTimeout(() => app.querySelectorAll(".fx-wait .fx-wait").forEach(x => x.classList.replace("fx-wait", "fx-go")), 0));
})();
