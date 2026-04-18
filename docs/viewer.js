// SOM Precourse 2026 — live slide viewer.
// Loads slides.json once, polls current.json for the live pointer, and
// renders absolute-positioned slide elements into a fixed 960x540 canvas
// that's scaled to fit the viewport.

(() => {
  const state = {
    deck: null,
    viewingIdx: 1,
    liveIdx: 1,
    liveUpdated: null,
    liveStale: false,
    followLive: true,
    thumbsVisible: true,
  };

  const el = (sel) => document.querySelector(sel);
  const slideEl = el("#slide");
  const scalerEl = el("#slide-scaler");
  const thumbsEl = el("#thumbs");
  const liveNumEl = el("#live-num");
  const totalNumEl = el("#total-num");
  const viewingNumEl = el("#viewing-num");
  const layoutEl = el("#layout-name");
  const updatedEl = el("#updated");
  const liveIndicator = el("#live-indicator");
  const jumpInput = el("#jump");
  const mainEl = document.querySelector("main");

  // ---------- loading ----------
  async function loadDeck() {
    const res = await fetch("slides.json", { cache: "no-cache" });
    state.deck = await res.json();
    totalNumEl.textContent = state.deck.slides.length;
    jumpInput.max = state.deck.slides.length;
    buildThumbs();
  }

  async function loadLive() {
    try {
      const res = await fetch("current.json?_=" + Date.now(), { cache: "no-cache" });
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json();
      const n = Math.max(1, Math.min(state.deck.slides.length, Number(data.slide) || 1));
      const changed = n !== state.liveIdx;
      state.liveIdx = n;
      state.liveUpdated = data.updated || null;
      state.liveStale = false;
      liveNumEl.textContent = n;
      liveIndicator.classList.remove("stale");
      updatedEl.textContent = data.updated ? new Date(data.updated).toLocaleString() : "–";
      markThumbs();
      if (state.followLive) showSlide(n, { fromLive: true });
      else if (changed) flashLiveButton();
    } catch (err) {
      state.liveStale = true;
      liveIndicator.classList.add("stale");
    }
  }

  // ---------- rendering ----------
  function renderRun(run) {
    const span = document.createElement("span");
    const parts = (run.text || "").split("\n");
    parts.forEach((part, i) => {
      if (i > 0) span.appendChild(document.createElement("br"));
      span.appendChild(document.createTextNode(part));
    });
    const s = span.style;
    if (run.size) s.fontSize = run.size + "px";
    if (run.bold) s.fontWeight = "700";
    if (run.italic) s.fontStyle = "italic";
    if (run.underline) s.textDecoration = "underline";
    if (run.color) s.color = run.color;
    if (run.name) s.fontFamily = `"${run.name}", "Helvetica Neue", Arial, sans-serif`;
    return span;
  }

  function renderTextEl(element) {
    const box = document.createElement("div");
    box.className = "el text";
    positionBox(box, element);
    const defs = element.defaults || {};
    box.style.fontSize = (defs.size || 16) + "px";
    box.style.color = defs.color || "#111827";
    box.style.fontWeight = defs.bold ? "700" : "400";
    box.style.textAlign = defs.align || "left";
    box.style.justifyContent = "center";

    const paras = element.paragraphs || [];
    for (const p of paras) {
      const para = document.createElement("p");
      if (p.level) para.className = "lvl-" + Math.min(3, p.level);
      if (p.align) para.style.textAlign = p.align;
      if (!p.runs || p.runs.length === 0) {
        para.innerHTML = "&nbsp;";
      } else {
        for (const run of p.runs) {
          para.appendChild(renderRun(run));
        }
      }
      box.appendChild(para);
    }
    return box;
  }

  function renderImageEl(element) {
    const box = document.createElement("div");
    box.className = "el image";
    positionBox(box, element);
    const img = document.createElement("img");
    img.src = element.src;
    img.alt = "";
    img.loading = "lazy";
    box.appendChild(img);
    return box;
  }

  function renderRectEl(element) {
    const box = document.createElement("div");
    box.className = "el rect";
    positionBox(box, element);
    box.style.background = element.color;
    return box;
  }

  function positionBox(box, element) {
    box.style.left = element.x + "px";
    box.style.top = element.y + "px";
    box.style.width = element.w + "px";
    box.style.height = element.h + "px";
  }

  function renderSlide(idx) {
    const slide = state.deck.slides[idx - 1];
    if (!slide) return;
    slideEl.innerHTML = "";
    slideEl.style.background = slide.bg || "#ffffff";
    for (const element of slide.elements) {
      let node;
      if (element.type === "text") node = renderTextEl(element);
      else if (element.type === "image") node = renderImageEl(element);
      else if (element.type === "rect") node = renderRectEl(element);
      if (node) slideEl.appendChild(node);
    }
    layoutEl.textContent = slide.layout || "";
  }

  function fitSlide() {
    const w = scalerEl.clientWidth;
    const h = scalerEl.clientHeight;
    if (!w || !h) return;
    const scale = Math.min(w / state.deck.width, h / state.deck.height);
    slideEl.style.transform = `scale(${scale})`;
  }

  // ---------- navigation ----------
  function showSlide(n, { fromLive = false } = {}) {
    n = Math.max(1, Math.min(state.deck.slides.length, n));
    state.viewingIdx = n;
    if (!fromLive) state.followLive = (n === state.liveIdx);
    viewingNumEl.textContent = "Slide " + n;
    jumpInput.value = n;
    renderSlide(n);
    fitSlide();
    markThumbs();
  }

  function nextSlide() { showSlide(state.viewingIdx + 1); }
  function prevSlide() { showSlide(state.viewingIdx - 1); }
  function goLive() {
    state.followLive = true;
    showSlide(state.liveIdx, { fromLive: true });
  }

  // ---------- thumbnails ----------
  function thumbTitle(slide) {
    for (const e of slide.elements) {
      if (e.type !== "text") continue;
      for (const p of (e.paragraphs || [])) {
        for (const r of (p.runs || [])) {
          const t = (r.text || "").trim();
          if (t) return t;
        }
      }
    }
    return slide.layout || "Slide";
  }

  function buildThumbs() {
    thumbsEl.innerHTML = "";
    state.deck.slides.forEach((slide) => {
      const t = document.createElement("div");
      t.className = "thumb";
      t.dataset.idx = slide.index;
      t.innerHTML =
        `<span class="n">${slide.index}</span>` +
        `<span class="title-text"></span>` +
        `<span class="live-badge" hidden>LIVE</span>`;
      t.querySelector(".title-text").textContent = thumbTitle(slide);
      t.addEventListener("click", () => showSlide(slide.index));
      thumbsEl.appendChild(t);
    });
    markThumbs();
  }

  function markThumbs() {
    thumbsEl.querySelectorAll(".thumb").forEach((t) => {
      const idx = Number(t.dataset.idx);
      t.classList.toggle("viewing", idx === state.viewingIdx);
      t.classList.toggle("live", idx === state.liveIdx);
      const badge = t.querySelector(".live-badge");
      if (badge) badge.hidden = idx !== state.liveIdx;
    });
    const liveThumb = thumbsEl.querySelector(".thumb.live");
    if (liveThumb && state.followLive) {
      liveThumb.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function flashLiveButton() {
    const btn = el("#goto-live");
    btn.animate(
      [{ background: "#14532d" }, { background: "#0b1220" }],
      { duration: 900 }
    );
  }

  function toggleThumbs() {
    state.thumbsVisible = !state.thumbsVisible;
    mainEl.classList.toggle("no-thumbs", !state.thumbsVisible);
    fitSlide();
  }

  // ---------- events ----------
  el("#next").addEventListener("click", nextSlide);
  el("#prev").addEventListener("click", prevSlide);
  el("#goto-live").addEventListener("click", goLive);
  el("#toggle-thumbs").addEventListener("click", toggleThumbs);
  jumpInput.addEventListener("change", () => showSlide(Number(jumpInput.value) || 1));

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); nextSlide(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prevSlide(); }
    else if (e.key === "Home") { e.preventDefault(); showSlide(1); }
    else if (e.key === "End") { e.preventDefault(); showSlide(state.deck.slides.length); }
    else if (e.key === "l" || e.key === "L") { e.preventDefault(); goLive(); }
    else if (e.key === "t" || e.key === "T") { e.preventDefault(); toggleThumbs(); }
  });
  window.addEventListener("resize", fitSlide);

  // ---------- init ----------
  (async () => {
    await loadDeck();
    // optional ?slide=N for deep-linking a specific slide
    const params = new URLSearchParams(location.search);
    const fromUrl = Number(params.get("slide"));
    await loadLive();
    if (fromUrl && fromUrl >= 1 && fromUrl <= state.deck.slides.length) {
      showSlide(fromUrl);
    } else {
      showSlide(state.liveIdx, { fromLive: true });
    }
    fitSlide();
    // poll for live pointer changes every 15s
    setInterval(loadLive, 15000);
  })();
})();
