# SOM-2026-Pages

Live, web-based viewer for the SOM Informatics Precourse 2026 slide deck.
Shows the deck as a website and highlights the slide that's currently being
presented, driven by a committed pointer file.

## What's in here

- `SOM_PC_26_Slides.pptx` — source deck (do not edit directly if you can
  help it; edit in Google Slides and re-export).
- `build.py` — parses the pptx with `python-pptx` and emits
  `docs/slides.json` plus per-image PNGs in `docs/media/`.
- `docs/` — the static site deployed to GitHub Pages.
  - `index.html` + `viewer.js` + `style.css` — the live viewer.
  - `admin.html` — helper to generate an updated `current.json`.
  - `slides.json` — all 75 slides as structured data (absolute positions).
  - `current.json` — pointer to the slide that's currently being presented.
  - `media/` — images referenced from slides.

## Updating the live slide

Two ways:

1. Edit `docs/current.json` directly on GitHub, bump `slide` to the current
   number, commit. The viewer polls every ~15 seconds.
2. Open `docs/admin.html` in the browser (works locally or on Pages), pick
   the slide, click "Copy JSON", then "Edit on GitHub" to paste & commit.

## Rebuilding from the pptx

```
pip install python-pptx
python build.py
```

## Local preview

```
cd docs && python -m http.server 8000
# open http://localhost:8000
```
