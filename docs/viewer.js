// SOM Precourse 2026 — live slide viewer (image-based).
// Shows a pre-rendered PNG per slide plus a thumbnail rail.
// The live slide is driven by docs/current.json, polled every 15s.

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
  const imgEl = el("#slide-img");
  const slideEl = el("#slide");
  const thumbsEl = el("#thumbs");
  const liveNumEl = el("#live-num");
  const totalNumEl = el("#total-num");
  const viewingNumEl = el("#viewing-num");
  const layoutEl = el("#layout-name");
  const updatedEl = el("#updated");
  const liveIndicator = el("#live-indicator");
  const jumpInput = el("#jump");
  const mainEl = document.querySelector("main");

  const pad2 = (n) => String(n).padStart(2, "0");
  const slideSrc = (n) => `slides/slide-${pad2(n)}.png`;
  const thumbSrc = (n) => `slides/thumb-${pad2(n)}.png`;

  // ---------- loading ----------
  async function loadDeck() {
    const res = await fetch("slides.json", { cache: "no-cache" });
    state.deck = await res.json();
    totalNumEl.textContent = state.deck.count;
    jumpInput.max = state.deck.count;
    buildThumbs();
  }

  async function loadLive() {
    try {
      const res = await fetch("current.json?_=" + Date.now(), { cache: "no-cache" });
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json();
      const n = Math.max(1, Math.min(state.deck.count, Number(data.slide) || 1));
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

  // ---------- navigation ----------
  function showSlide(n, { fromLive = false } = {}) {
    n = Math.max(1, Math.min(state.deck.count, n));
    state.viewingIdx = n;
    if (!fromLive) state.followLive = (n === state.liveIdx);
    const slide = state.deck.slides[n - 1];
    viewingNumEl.textContent = `Slide ${n}${slide && slide.title ? " — " + slide.title : ""}`;
    layoutEl.textContent = slide ? slide.layout || "" : "";
    jumpInput.value = n;
    // swap image (preload next/prev to avoid flicker)
    imgEl.src = slideSrc(n);
    imgEl.alt = slide ? `Slide ${n}: ${slide.title}` : `Slide ${n}`;
    if (n + 1 <= state.deck.count) new Image().src = slideSrc(n + 1);
    if (n - 1 >= 1) new Image().src = slideSrc(n - 1);
    markThumbs();
  }

  function nextSlide() { showSlide(state.viewingIdx + 1); }
  function prevSlide() { showSlide(state.viewingIdx - 1); }
  function goLive() {
    state.followLive = true;
    showSlide(state.liveIdx, { fromLive: true });
  }

  // ---------- thumbnails ----------
  function buildThumbs() {
    thumbsEl.innerHTML = "";
    for (const s of state.deck.slides) {
      const t = document.createElement("div");
      t.className = "thumb";
      t.dataset.idx = s.index;
      t.innerHTML = `
        <div class="thumb-img"><img loading="lazy" alt="" src="${thumbSrc(s.index)}"></div>
        <div class="thumb-meta">
          <span class="n">${s.index}</span>
          <span class="title-text"></span>
          <span class="live-badge" hidden>LIVE</span>
        </div>`;
      t.querySelector(".title-text").textContent = s.title || s.layout || "Slide";
      t.addEventListener("click", () => showSlide(s.index));
      thumbsEl.appendChild(t);
    }
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
  }

  // ---------- events ----------
  el("#next").addEventListener("click", nextSlide);
  el("#prev").addEventListener("click", prevSlide);
  el("#goto-live").addEventListener("click", goLive);
  el("#toggle-thumbs").addEventListener("click", toggleThumbs);
  jumpInput.addEventListener("change", () => showSlide(Number(jumpInput.value) || 1));
  imgEl.addEventListener("click", nextSlide);
  imgEl.addEventListener("error", () => {
    slideEl.classList.add("missing");
  });
  imgEl.addEventListener("load", () => {
    slideEl.classList.remove("missing");
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); nextSlide(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prevSlide(); }
    else if (e.key === "Home") { e.preventDefault(); showSlide(1); }
    else if (e.key === "End") { e.preventDefault(); showSlide(state.deck.count); }
    else if (e.key === "l" || e.key === "L") { e.preventDefault(); goLive(); }
    else if (e.key === "t" || e.key === "T") { e.preventDefault(); toggleThumbs(); }
    else if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFullscreen(); }
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // ---------- init ----------
  (async () => {
    await loadDeck();
    const params = new URLSearchParams(location.search);
    const fromUrl = Number(params.get("slide"));
    await loadLive();
    if (fromUrl && fromUrl >= 1 && fromUrl <= state.deck.count) {
      showSlide(fromUrl);
    } else {
      showSlide(state.liveIdx, { fromLive: true });
    }
    setInterval(loadLive, 15000);
  })();
})();
