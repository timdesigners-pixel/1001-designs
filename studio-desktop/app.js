/* Binbir Dizayn Stüdyo — arayüz. Veri ana süreçten (doğrulanmış) gelir; önizlemeler sandbox'lı iframe'de çalışır.
 * Metin yalnız textContent ile yazılır; bileşen HTML'i yalnız önizleme çerçevesine gider. */
(() => {
  "use strict";
  const L = window.BDLibrary, P = window.BDPalette, D = window.bdDesktop;
  const $ = (s) => document.querySelector(s);
  const PAGE = 24, NAT_W = 760, NAT_H = 440;
  const FAV_KEY = "bd.favorites";

  const state = { entries: [], byId: new Map(), fav: new Set(), list: [], shown: 0, view: "library", palette: null, current: null, code: "html" };

  const ico = (paths) => `<svg class="pl-ico" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const STAR = '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>';

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---- Bildirim -------------------------------------------------------------
  function toast(msg, kind = "success") {
    const t = el("div", "pl-toast");
    t.setAttribute("role", kind === "danger" ? "alert" : "status");
    if (kind === "danger") t.style.setProperty("--pl-c", "var(--pl-danger)");
    t.innerHTML = kind === "danger" ? ico('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>') : ico('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>');
    t.appendChild(el("div", "pl-toast__body", msg));
    $("#toasts").appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
  async function copy(text, what) {
    try { await D.copy(text); toast(`${what} panoya kopyalandı`); } catch { toast("Kopyalanamadı", "danger"); }
  }

  // ---- Favoriler -----------------------------------------------------------
  async function saveFav() {
    try { await D.storage.set({ [FAV_KEY]: [...state.fav] }); } catch { toast("Favoriler kaydedilemedi", "danger"); }
    $("#favCount").textContent = String(state.fav.size);
  }
  function toggleFav(id) {
    if (state.fav.has(id)) state.fav.delete(id); else state.fav.add(id);
    saveFav();
    document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach(paintFav);
    if (state.current && state.current.id === id) paintDetailFav();
    if (state.view === "favorites") renderFavorites();
  }
  function paintFav(btn) {
    const on = state.fav.has(btn.dataset.fav);
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Favorilerden çıkar" : "Favorilere ekle");
    btn.classList.toggle("is-active", on);
  }

  // ---- Önizleme çerçeveleri ------------------------------------------------
  const frames = new Map(); // contentWindow → entry
  window.addEventListener("message", (e) => {
    const entry = frames.get(e.source);
    if (!entry || !e.data) return;
    if (e.data.type === "ready") e.source.postMessage({ type: "render", html: entry.html, css: entry.css, js: entry.js, bg: entry.tokens.colors.bg || "" }, "*");
  });
  function previewFrame(title, interactive) {
    const f = document.createElement("iframe");
    f.setAttribute("sandbox", "allow-scripts");
    f.setAttribute("referrerpolicy", "no-referrer");
    f.title = title;
    if (!interactive) f.tabIndex = -1;
    return f;
  }
  function loadFrame(f, entry) {
    // contentWindow, iframe DOM'a eklenince geçerli olur; ready mesajından önce eşleme yapılmalı.
    frames.set(f.contentWindow, entry);
    f.src = "preview.html";
  }

  const io = new IntersectionObserver((items) => {
    for (const it of items) {
      if (!it.isIntersecting) continue;
      io.unobserve(it.target);
      const f = it.target.querySelector("iframe");
      scaleThumb(it.target);
      loadFrame(f, state.byId.get(it.target.dataset.id));
    }
  }, { rootMargin: "300px" });
  function scaleThumb(wrap) {
    const f = wrap.querySelector("iframe");
    if (f) f.style.transform = `scale(${wrap.clientWidth / NAT_W})`;
  }
  window.addEventListener("resize", () => document.querySelectorAll(".bd-thumb").forEach(scaleThumb));

  function card(e) {
    const c = el("article", "pl-card bd-item");
    c.dataset.id = e.id;
    const wrap = el("button", "bd-thumb");
    wrap.type = "button";
    wrap.dataset.id = e.id;
    wrap.setAttribute("aria-label", `${e.name} — ayrıntıyı aç`);
    const f = previewFrame(e.name, false);
    f.style.width = NAT_W + "px";
    f.style.height = NAT_H + "px";
    wrap.appendChild(f);
    wrap.addEventListener("click", () => openDetail(e.id));
    const meta = el("div", "bd-meta");
    const txt = el("div", "bd-grow");
    txt.appendChild(el("b", "bd-title", e.name));
    txt.appendChild(el("span", "pl-muted bd-small", `${e.categoryTr} · ${e.tokens.palette} · ${e.tokens.mode === "dark" ? "koyu" : "açık"}${e.interactive ? " · etkileşimli" : ""}`));
    const fav = el("button", "pl-iconbtn pl-iconbtn--sm");
    fav.type = "button";
    fav.dataset.fav = e.id;
    fav.innerHTML = ico(STAR);
    fav.addEventListener("click", () => toggleFav(e.id));
    paintFav(fav);
    meta.append(txt, fav);
    c.append(wrap, meta);
    queueMicrotask(() => io.observe(wrap));
    return c;
  }

  // ---- Kütüphane -----------------------------------------------------------
  function filters() {
    return { q: $("#q").value, category: $("#cat").value, mode: $("#mode").value, palette: $("#pal").value, interactive: $("#inter").checked };
  }
  function applyFilters() {
    state.list = L.filterEntries(state.entries, filters());
    state.shown = 0;
    clearGrid($("#grid"));
    nextPage();
  }
  function clearGrid(g) {
    g.querySelectorAll(".bd-thumb").forEach((w) => io.unobserve(w));
    g.querySelectorAll("iframe").forEach((f) => frames.delete(f.contentWindow));
    g.replaceChildren();
  }
  function nextPage() {
    const part = state.list.slice(state.shown, state.shown + PAGE);
    const g = $("#grid");
    part.forEach((e) => g.appendChild(card(e)));
    state.shown += part.length;
    $("#more").hidden = state.shown >= state.list.length;
    $("#empty").hidden = state.list.length > 0;
    $("#count").textContent = state.list.length === state.entries.length
      ? `${state.list.length.toLocaleString("tr-TR")} bileşen`
      : `${state.list.length.toLocaleString("tr-TR")} / ${state.entries.length.toLocaleString("tr-TR")} bileşen eşleşti`;
  }

  function renderFavorites() {
    const g = $("#favGrid");
    clearGrid(g);
    const list = state.entries.filter((e) => state.fav.has(e.id));
    list.forEach((e) => g.appendChild(card(e)));
    $("#favEmpty").hidden = list.length > 0;
    $("#favInfo").textContent = list.length ? `${list.length} favori bileşen` : "";
  }

  // ---- Görünümler ----------------------------------------------------------
  function setView(v) {
    state.view = v;
    document.querySelectorAll("#tabs .pl-tab").forEach((t) => {
      const on = t.dataset.view === v;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
    });
    document.querySelectorAll(".bd-view").forEach((s) => { s.hidden = s.dataset.view !== v; });
    if (v === "favorites") renderFavorites();
    if (v === "library") requestAnimationFrame(() => document.querySelectorAll("#grid .bd-thumb").forEach(scaleThumb));
  }
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest(".pl-tab"); if (b) setView(b.dataset.view); });

  // ---- Ayrıntı -------------------------------------------------------------
  const CODE_NAME = { html: "index.html", css: "style.css", js: "script.js" };
  function openDetail(id) {
    const e = state.byId.get(id);
    if (!e) return;
    state.current = e;
    $("#dTitle").textContent = e.name;
    $("#dSub").textContent = e.description;
    const prev = $("#dPrev");
    prev.querySelectorAll("iframe").forEach((f) => frames.delete(f.contentWindow));
    prev.replaceChildren();
    const f = previewFrame(`${e.name} — canlı önizleme`, true);
    prev.appendChild(f);
    loadFrame(f, e);

    const sw = $("#dSw");
    sw.replaceChildren();
    for (const [k, hex] of Object.entries(e.tokens.colors)) {
      const b = el("button", "pl-swatch");
      b.type = "button";
      b.style.background = hex;
      b.title = `${k}: ${hex} — kopyala`;
      b.setAttribute("aria-label", `${k} ${hex} kopyala`);
      b.addEventListener("click", () => copy(hex, hex));
      sw.appendChild(b);
    }
    const kv = $("#dKv");
    kv.replaceChildren();
    const rows = [["Kimlik", e.id], ["Kategori", `${e.categoryTr} (${e.categoryTitle})`], ["Yerleşim", e.layout], ["Palet", `${e.tokens.palette} · ${e.tokens.mode === "dark" ? "koyu" : "açık"}`],
      ["Köşe / gölge", `${e.tokens.radiusName}${e.tokens.radius != null ? ` (${e.tokens.radius})` : ""} · ${e.tokens.shadow}`], ["Yazı / yoğunluk", `${e.tokens.font} · ${e.tokens.density}`], ["Etkileşim", e.interactive ? "JavaScript içerir" : "Yalnız HTML/CSS"]];
    for (const [k, v] of rows) { kv.appendChild(el("dt", null, k)); kv.appendChild(el("dd", null, v)); }
    showCode("html");
    paintDetailFav();
    const dlg = $("#detail");
    if (!dlg.open) dlg.showModal();
  }
  function paintDetailFav() {
    const on = state.current && state.fav.has(state.current.id);
    const b = $("#dFav");
    b.textContent = on ? "★ Favorilerden çıkar" : "☆ Favorilere ekle";
    b.setAttribute("aria-pressed", String(!!on));
  }
  function showCode(kind) {
    state.code = kind;
    document.querySelectorAll("#codeTabs .pl-tab").forEach((t) => {
      const on = t.dataset.code === kind;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
    });
    $("#codeName").textContent = CODE_NAME[kind];
    const src = state.current ? state.current[kind] : "";
    $("#codePre").textContent = src && src.trim() ? src : "/* Bu bileşende JavaScript yok */";
  }
  $("#codeTabs").addEventListener("click", (e) => { const b = e.target.closest(".pl-tab"); if (b) showCode(b.dataset.code); });
  $("#codeCopy").addEventListener("click", () => state.current && copy(state.current[state.code], CODE_NAME[state.code]));
  $("#dCopyDoc").addEventListener("click", () => state.current && copy(L.entryDocument(state.current), "Tek dosya HTML belgesi"));
  $("#dFav").addEventListener("click", () => state.current && toggleFav(state.current.id));
  $("#dClose").addEventListener("click", () => $("#detail").close());
  $("#detail").addEventListener("close", () => {
    $("#dPrev").querySelectorAll("iframe").forEach((f) => frames.delete(f.contentWindow));
    $("#dPrev").replaceChildren();
  });
  $("#dExport").addEventListener("click", async () => {
    if (!state.current) return;
    try {
      const r = await D.exportHtml(state.current.id);
      if (r && r.ok) toast(`Kaydedildi: ${r.file}`);
    } catch { toast("Kaydedilemedi", "danger"); }
  });

  // ---- Görselden palet -----------------------------------------------------
  const MAX_IMG = 25 * 1024 * 1024;
  let imgUrl = null;
  async function useImage(file) {
    if (!file || !/^image\//.test(file.type)) return toast("Lütfen bir görsel dosyası seçin", "danger");
    if (file.size > MAX_IMG) return toast("Görsel 25 MB'tan büyük", "danger");
    try {
      const r = await P.extractPalette(file, 8);
      if (!r.colors.length) return toast("Görselde okunabilir renk bulunamadı", "danger");
      if (imgUrl) URL.revokeObjectURL(imgUrl);
      imgUrl = URL.createObjectURL(file);
      const img = $("#imgPrev");
      img.src = imgUrl;
      img.alt = `Seçilen görsel: ${file.name} (${r.width}×${r.height})`;
      img.hidden = false;
      state.palette = r.colors;
      renderPalette();
    } catch {
      toast("Görsel okunamadı", "danger");
    }
  }
  function renderPalette() {
    const list = $("#palList");
    list.replaceChildren();
    for (const c of state.palette) {
      const b = el("button", "bd-chip");
      b.type = "button";
      b.style.background = c.hex;
      b.style.color = c.text;
      b.appendChild(el("b", null, c.hex));
      b.appendChild(el("span", null, `%${c.pct}`));
      b.setAttribute("aria-label", `${c.hex}, yüzde ${c.pct} — kopyala`);
      b.addEventListener("click", () => copy(c.hex, c.hex));
      list.appendChild(b);
    }
    $("#palOut").hidden = false;
    const near = L.nearestEntries(state.entries, state.palette, 12);
    const g = $("#nearGrid");
    clearGrid(g);
    near.forEach((n) => g.appendChild(card(n.entry)));
    $("#nearTitle").hidden = near.length === 0;
  }
  $("#palCopy").addEventListener("click", () => state.palette && copy(L.paletteCss(state.palette), "CSS değişkenleri"));
  $("#imgPick").addEventListener("change", (e) => { useImage(e.target.files[0]); e.target.value = ""; });
  const drop = $("#drop");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-dragover"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-dragover"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("is-dragover"); useImage(e.dataTransfer.files[0]); });
  // Pencereye bırakılan dosya sayfayı açmaya çalışmasın.
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

  // ---- Komut paleti (Ctrl+K) -----------------------------------------------
  let cmds = [], cmdSel = 0;
  function commandList() {
    const base = [
      { group: "Gezinme", label: "Kütüphaneye git", run: () => setView("library") },
      { group: "Gezinme", label: "Favorileri aç", run: () => setView("favorites") },
      { group: "Gezinme", label: "Görselden palet çıkar", run: () => { setView("palette"); $("#imgPick").click(); } },
      { group: "Eylemler", label: "Aramaya odaklan", run: () => { setView("library"); $("#q").focus(); } },
      { group: "Eylemler", label: "Süzgeçleri temizle", run: clearFilters },
      { group: "Eylemler", label: "Yalnız koyu temalı bileşenler", run: () => { setView("library"); $("#mode").value = "dark"; applyFilters(); } },
      { group: "Eylemler", label: "Yalnız etkileşimli bileşenler", run: () => { setView("library"); $("#inter").checked = true; applyFilters(); } },
    ];
    for (const c of L.categories(state.entries)) base.push({ group: "Kategoriler", label: `Kategori: ${c.title} (${c.count})`, run: () => { setView("library"); $("#cat").value = c.category; applyFilters(); } });
    return base;
  }
  function renderCmds() {
    const words = L.fold($("#cmdQ").value).split(/\s+/).filter(Boolean);
    cmds = commandList().filter((c) => words.every((w) => L.fold(c.label).includes(w)));
    cmdSel = Math.min(cmdSel, Math.max(0, cmds.length - 1));
    const list = $("#cmdList");
    list.replaceChildren();
    let group = null;
    cmds.forEach((c, i) => {
      if (c.group !== group) { group = c.group; list.appendChild(el("div", "pl-cmdk__group pl-label", group)); }
      const it = el("div", "pl-menuitem" + (i === cmdSel ? " is-active" : ""), c.label);
      it.setAttribute("role", "option");
      it.setAttribute("aria-selected", String(i === cmdSel));
      it.addEventListener("click", () => runCmd(i));
      list.appendChild(it);
    });
    if (!cmds.length) list.appendChild(el("div", "pl-muted bd-pad", "Eşleşen komut yok"));
    const act = list.querySelector(".is-active");
    if (act) act.scrollIntoView({ block: "nearest" });
  }
  function runCmd(i) {
    const c = cmds[i];
    $("#cmdk").close();
    if (c) c.run();
  }
  function openCmdk() {
    const d = $("#cmdk");
    if (d.open) return;
    if ($("#detail").open) $("#detail").close();
    $("#cmdQ").value = "";
    cmdSel = 0;
    renderCmds();
    d.showModal();
    $("#cmdQ").focus();
  }
  $("#cmdQ").addEventListener("input", () => { cmdSel = 0; renderCmds(); });
  $("#cmdQ").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); cmdSel = Math.min(cmds.length - 1, cmdSel + 1); renderCmds(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); cmdSel = Math.max(0, cmdSel - 1); renderCmds(); }
    else if (e.key === "Enter") { e.preventDefault(); runCmd(cmdSel); }
  });
  $("#cmdk").addEventListener("click", (e) => { if (e.target === $("#cmdk")) $("#cmdk").close(); });
  $("#cmdBtn").addEventListener("click", openCmdk);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmdk(); return; }
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName);
    if (e.key === "/" && !typing && !document.querySelector("dialog[open]")) { e.preventDefault(); setView("library"); $("#q").focus(); }
  });

  function clearFilters() {
    setView("library");
    $("#q").value = ""; $("#cat").value = ""; $("#mode").value = ""; $("#pal").value = ""; $("#inter").checked = false;
    applyFilters();
  }

  // ---- Başlat --------------------------------------------------------------
  async function init() {
    try {
      const r = await D.library();
      state.entries = r.entries;
      state.byId = new Map(r.entries.map((e) => [e.id, e]));
      const interactive = r.entries.filter((e) => e.interactive).length;
      $("#sub").textContent = `${r.entries.length.toLocaleString("tr-TR")} bileşen · ${interactive} etkileşimli · çevrimdışı${r.rejected ? ` · ${r.rejected} geçersiz girdi atlandı` : ""}`;
    } catch {
      $("#sub").textContent = "Kütüphane yüklenemedi";
      toast("Bileşen kütüphanesi okunamadı", "danger");
      return;
    }
    try {
      const s = await D.storage.get([FAV_KEY]);
      const list = Array.isArray(s[FAV_KEY]) ? s[FAV_KEY] : [];
      state.fav = new Set(list.filter((id) => typeof id === "string" && state.byId.has(id)));
    } catch { /* boş favorilerle devam */ }
    $("#favCount").textContent = String(state.fav.size);
    const cat = $("#cat");
    for (const c of L.categories(state.entries)) cat.appendChild(Object.assign(document.createElement("option"), { value: c.category, textContent: `${c.title} (${c.count})` }));
    const pal = $("#pal");
    for (const p of L.palettes(state.entries)) pal.appendChild(Object.assign(document.createElement("option"), { value: p, textContent: p }));
    let t;
    $("#q").addEventListener("input", () => { clearTimeout(t); t = setTimeout(applyFilters, 180); });
    ["#cat", "#mode", "#pal", "#inter"].forEach((s) => $(s).addEventListener("change", applyFilters));
    $("#more").addEventListener("click", nextPage);
    $("#clear").addEventListener("click", clearFilters);
    applyFilters();
    document.getElementById("root").dataset.ready = "1";
  }
  init();
})();
