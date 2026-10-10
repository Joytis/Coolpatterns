# Coolpatterns

A sewing pattern designer that runs in the browser on desktop, iPad and phone. Pick a pattern, choose
designs for each part, assign fabrics, and get:

- a live **3D preview** of the finished piece in your fabrics (drag to turn, pinch to zoom),
- a **cut list** with seam allowances, grainlines, full-size SVG downloads and a printable cutting sheet,
- **yardage and cost per fabric**, with a cutting layout for each bolt width,
- **autosave** in the browser, plus backup/restore to a file.

It can be installed like an app: in Safari on iPad/iPhone use *Share → Add to Home Screen*; in Chrome or
Edge use the install icon in the address bar. It keeps working offline once opened.

## Patterns

### 10×10 canopy cover

A one-piece decorative cover that drapes over a 10×10 pop-up canopy (built around the Academy Sports
10×10 straight-leg one-push canopy).

- **Section 1, roof faces:** solid, split, horizontal bands, sunburst rays or nested triangles, optionally
  alternating colors face to face, with an optional appliqué (heart, star, sun, flower, moon, diamond).
- **Section 2, runners:** straight, scallops, points, dagged leaves, waves, castle tabs or bunting flags,
  with an optional trim band and lining.
- **Vent:** a matching vent cap that leaves the tent's vents open, a bound opening the tent's own vent
  pokes through, or a closed peak.
- **Tent measurements** are editable; the defaults are estimates, so measure your tent.

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # production build in dist/
```

The app is React + TypeScript on Vite, with three.js for the preview. Pattern geometry lives in
`src/patterns/<pattern>/`; shared geometry, seam allowance, fabric layout and storage live in
`src/core/`. To add a pattern, implement `PatternDefinition` (`src/patterns/types.ts`) and register it in
`src/patterns/index.ts`.

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml` (set *Settings → Pages →
Source* to *GitHub Actions* once).
