# Website

Trevor Chen's personal site. Plain HTML/CSS/JS, served by GitHub Pages.

- `build.py` generates every `.html` page (shared sidebar, banner, footer). Edit content there, then run `python3 build.py`.
- `style.css` holds the look (Arcane / Spider-Verse palette, halftone, comic panels).
- `site.js` runs the `black_hole.cam` lensing shader and the per-browser visit counter.
- `latex/` holds the LaTeX sources for the resume and CV. Build with `xelatex Trevor_Chen_Resume.tex` (and `Trevor_Chen_CV.tex`) inside `latex/`, then copy the PDFs to the repo root, which is where the site links to them.
