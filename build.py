#!/usr/bin/env python3
"""Emit `docs/slides.json` with per-slide titles + layout names.

The slide *images* are rendered by `.github/workflows/deploy.yml` (LibreOffice
-> PDF -> PNG) — this script only produces the lightweight index that the
viewer and admin page use for titles and slide counts.
"""

from __future__ import annotations

import json
from pathlib import Path

from pptx import Presentation

ROOT = Path(__file__).resolve().parent
PPTX = ROOT / "SOM_PC_26_Slides.pptx"
DOCS = ROOT / "docs"


def first_nonempty_text(slide) -> str:
    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        for para in shape.text_frame.paragraphs:
            text = para.text.strip()
            if text:
                # Flatten tabs/soft breaks used by PowerPoint
                return text.replace("\v", " ").replace("\t", " ")
    return ""


def build() -> None:
    DOCS.mkdir(exist_ok=True)
    prs = Presentation(PPTX)
    slides = []
    # LibreOffice skips slides marked hidden (<p:sld show="0">) when exporting
    # to PDF, so the rendered PNG set excludes them. We mirror that here so
    # the viewer's slide index always matches the PNG filenames.
    position = 0
    for source_idx, slide in enumerate(prs.slides, start=1):
        if slide.element.get("show") == "0":
            continue
        position += 1
        slides.append({
            "index": position,
            "source_index": source_idx,
            "title": first_nonempty_text(slide) or f"Slide {source_idx}",
            "layout": slide.slide_layout.name,
        })

    payload = {
        "title": "SOM Informatics Precourse 2026",
        "count": len(slides),
        "slides": slides,
    }
    (DOCS / "slides.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1))
    print(f"wrote {len(slides)} slide entries (skipped {prs.slides.__len__() - len(slides)} hidden)")


if __name__ == "__main__":
    build()
