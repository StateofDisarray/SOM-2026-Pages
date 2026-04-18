# SOM-2026-Pages

Live, web-based viewer for the SOM Informatics Precourse 2026 slide deck.
The viewer highlights the slide that's currently being presented, driven by
a committed pointer file (`docs/current.json`).

## How it works

- **Slide rendering** — a GitHub Actions workflow
  (`.github/workflows/render-slides.yml`) installs LibreOffice, converts
  `SOM_PC_26_Slides.pptx` to PDF, then to high-res PNGs (1920px wide) plus
  400px-wide thumbnails. The images are committed to `docs/slides/`.
- **Static site** — `docs/` is served by GitHub Pages (branch mode, root
  `/docs`). `index.html` + `viewer.js` + `style.css` render the current
  slide as an `<img>` and poll `current.json` for live updates.
- **Live pointer** — `docs/current.json` names the slide number currently
  being presented. Edit + commit it to change the live slide. The viewer
  polls every 15 seconds.

## Setting the live slide

Two ways:

1. Edit `docs/current.json` on GitHub directly, bump `slide`, commit.
2. Open `docs/admin.html` in the browser, pick the slide, click **Copy
   JSON**, then **Edit on GitHub** to paste & commit.

## Updating the deck

1. Replace `SOM_PC_26_Slides.pptx`.
2. Commit. The render workflow regenerates PNGs + `slides.json`.
3. Pages updates automatically within a minute.

## Local preview

```bash
pip install python-pptx
python build.py          # rebuilds the titles index in docs/slides.json
cd docs && python -m http.server 8000
# open http://localhost:8000
```

Slide images only exist locally after the CI workflow has run at least
once (or if you run LibreOffice manually and drop PNGs into `docs/slides/`).

## Enabling on GitHub

In the repo's **Settings → Pages**, set the source to the
`claude/powerpoint-to-website-Mub1B` branch (or `main` after merging),
folder `/docs`.
