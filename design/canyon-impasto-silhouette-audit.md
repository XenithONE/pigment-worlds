# Silhouette audit for the adopted thick-paint panorama

Status: the corrected outline and revised panorama are adopted in the runtime.
Their filenames retain `candidate` for provenance.

At the start of the audit, `canyon-vista.js` and
`derive-canyon-ridgeline.py` were inspected read-only. The renderer traces one vertex column per image column,
then moves its top about half a source pixel inward and applies a narrow alpha
feather. The previous outline originated in a generated black/white mask, with
a local maximum-RGB threshold on the original castle. That threshold also cuts
some bright architectural strokes; differences are not all caused by the edit.

## Result

The previous outline was not an exact fit for the revised painting: it clipped
parts of the left mountain ridge and bright castle roofs, and retained small
pieces of painted sky in other places. The corrected numerical outline was
saved separately and has now been adopted:

`public/art/vistas/canyon-ridgeline-impasto-candidate.json`

It has 2172 normalized samples, matching the adopted 2172 × 724 painting.
All samples are finite and within [0,1]. The audit preserved the previous JSON,
panorama and mask source as historical assets; root subsequently updated the
runtime to use the revised panorama and outline.

The new data uses a color-boundary path near the old silhouette, constrained to
avoid following arbitrary cliff cracks. Bright ivory paint is ambiguous with
the sky, so left peak regions and the castle use visually inspected geometric
anchors. Broad placement remains unchanged. This is geometric tracing and
diagnostic plotting only; neither painting was repainted or composited by code.
The reproducible source is `design/audit-impasto-skyline.py`.

The median change from the old line is about 2 source pixels and the 95th
percentile about 10.6 pixels. A few thin castle-roof columns repair much larger
legacy threshold discontinuities (up to 67 px). Those extreme values describe
old-versus-corrected mesh data, **not** a 67 px compositional shift in the artwork.

## Specific visual findings

- Around x=110–130 and x=210–245, the old line bites into the small blue ridge
  between lit peaks; the corrected line restores its upper edge.
- Bright descending faces after the left peaks need special treatment because
  a generic color-gradient algorithm can follow the ivory/blue paint seam
  inside the mountain instead of its outline.
- On the castle, the old dark-pixel rule misses some bright thin roofs and
  creates deep narrow cut-ins. The corrected silhouette restores these forms
  while preserving the tallest spire's original location.
- Across the low distant central ridge, many smaller deviations leave a few
  source pixels of warm painted sky outside the land. The constrained trace
  trims those fringes where the boundary is identifiable.

## Review evidence

All figures are CPU Matplotlib diagnostics under:
`C:/Users/spkf8/Desktop/Project/.qa-pigment/canyon-impasto-silhouette/`

- `skyline-boundary-comparison.png`: all four horizontal regions, red=previous
  and turquoise=now-adopted geometry over the revised painting. The figure's
  original current/candidate labels record the audit stage.
- `left-corrected-detail.png`: enlarged left mountain peaks.
- `castle-corrected-detail.png`: enlarged thin castle spires.
- `castle-original-candidate-comparison.png`: old painting/previous line, revised
  painting/previous line, and revised painting/corrected line side by side.
- `audit-evidence.json`: numerical differences and method limits.

## Adopted full-scene validation

The initial tracing and comparison figures used CPU only. Root then integrated
the corrected outline with the revised panorama and captured
`C:/Users/spkf8/Desktop/Project/.qa-pigment/v14/world-2.png`. This full-scene
screenshot was inspected at original resolution. The visible castle spires
and left mountain peaks meet the active sky without an obvious cut-out border
or conspicuous sky-colored fringe in this entry view. The broad thick-paint
forms remain readable behind the real foreground geometry. Root reported no
page or shader errors during the capture.

The contour remains a practical visual trace, not an exact independently
measured segmentation: a few-pixel painterly boundary is subjective where warm
ridge highlights blend into cream clouds. The entry screenshot does not prove
every mirrored side/rear seam is clean. Root will document the broader 360°
look-around separately.
