# Paint bodies and folded leaves — v18, 2026-09-10

This revision keeps the existing four-world adventure and changes the generic leaf geometry, its pigment material, and the canyon's colour coverage. Deployment evidence is recorded separately in [publication.md](publication.md). Earlier [v17 checks](plant-verification-v17.md) and the [v16 full journey](verification.md) remain historical evidence.

## Selected visual changes

`dragged-leaf.js` replaces the inflated leaf section with a broad thin face, an asymmetric shoulder, a blunt dragged end and a thicker rolled edge. All three distance levels sample the same design. The shared `worlds.js` leaf factory uses it without changing instance placement, density, random sampling or LOD thresholds. Other grass, petal and stroke geometry factories retain their prior shapes.

The new oil-material variant recognises `dragged-pigment-leaf-*` geometry and keeps a separate cache entry. It uses the existing matched atlas colour sample to mix cool and warm pigment ratios into the authored leaf colour. It applies to meshes using this geometry, including coastal `grass` batches and leaf-shaped waterlily petals. Narrow grass blades and botanical irises keep their v17 material treatment. UV sampling, fine normal depth and clearcoat remain unchanged by this leaf colour extension.

The canyon retains the classic atlas, rest coordinates and physical displacement. A stable object-space layer field reduces source-colour coverage inside broad pigment bodies while retaining its blue/ochre/ivory brush strands at mixed interfaces. The same mask concentrates stronger clearcoat on raised interfaces. Its terrain palette now includes deep teal, olive, rust and ochre. The river, cascades, deposited loads, tree geometry, sky, lighting and distant images are unchanged.

The first canyon candidate erased too many colour strands and produced broad beige icing-like faces; it was rejected. Restoring more source colour, then changing the terrain palette, produced the selected candidate C. Independent review of actual entrance photographs supported its clearer colour masses while noting remaining glazed or model-like surfaces. The leaf's initial single olive colour also looked like clay; selected candidate D adds pigment variation along the existing brush field. Independent review supported the reduction in monotonous leaves, but still found repeated outlines and two-colour patterns that can resemble painted ceramic. These are improvements, not proof of reference-level fidelity.

## Actual browser verification

The final combined runtime was reloaded in the in-app browser at `http://127.0.0.1:5188/`, using the normal startup and world-selection UI. At 1280 × 720 and High quality, all four worlds rendered. Real W-key input and drag-look were exercised in the garden, coast and canyon. The game's photo button exported the final [coast](screenshots/paint-v18-coast.webp), [garden](screenshots/paint-v18-garden.webp) and [canyon entrance](screenshots/paint-v18-canyon.webp) photographs. No app state was changed through browser evaluation.

The final coast was also viewed at 390 × 844 with Low quality, then restored to High and the viewport override reset. The document width and canvas width were both 390 pixels, and the canvas height was 844 pixels. Mobile controls were visible. This is a desktop small-viewport layout and quality-switch check, not a physical-phone or touchscreen playtest. No frame-rate or hardware performance claim follows from it.

The final observed browser error log was empty. World transitions sometimes showed their loading panel across multiple observations before the rendered scene became available; this release does not claim short transitions. Repeated key counts do not establish identical camera distances across comparisons. The entrance photographs support a qualitative visual comparison, not a numerical fidelity score.

## Geometry verification

The [leaf factory audit](leaf-geometry-verification-v18.json) passed for all three levels. Each indexed edge was used twice with opposite winding; all attributes were finite, UV counts matched vertices, referenced normals were unit length within tolerance, and signed volumes were positive. High/mid/low retain 360/80/36 triangles, with volumes approximately 0.0065053/0.0051767/0.0041419 in local units. No triangle area fell below 1.32 × 10⁻⁶. This proves the checked topology and numeric properties, not absence of self-intersections or visual quality.

That factory audit's `worlds.js` hash predates the later canyon palette edit, while the audited leaf helper is the final source. Its comparison found unchanged placement/RNG/LOD source and byte-identical non-leaf compact factories at that point. The final integration audit is separate. The leaf helper's final SHA-256 is `8b51fc8df89eac926fe3daf8d392bc372eb8f1ff4aefc964a7554b0eaaa74b73`.

The final [material audit](material-verification-v18.json) passed 136 generated shader-hook cases, including 16 leaf-load cases and 8 canyon-mask cases. Leaf, narrow-grass and ordinary variants have separate defines/cache entries; the canyon mask is declared before its clearcoat use. Existing vertex coordinates, atlas sampling, fine normal and main roughness code remain unchanged. The checks exercised 720,000 canyon and 120,000 leaf numeric components without nonfinite outputs. This is CPU source/hook verification, not a GLSL compiler or GPU test; actual rendering is covered above. The new colour ratios also apply to the neutral atlas fallback, and the canyon body/coat mask also operates when rich-pigment mode is off.

The final [world integration audit](leaf-integration-verification-v18.json) created all four worlds and exercised High/Auto/Low plus coarse-pointer branches. All target leaf/grass LODs retained valid UVs. Of 347 flagged generic batches, 131 use the dedicated leaf-load variant across five generated leaf materials. Twenty generated generic materials and all 388 tracked resources were disposed exactly once, with original materials restored. Seven unrelated geometry outputs were byte-identical to v17. These counts cover the probe's generic foliage resources, not the entire renderer or a GPU-memory measurement.

The final runtime hashes are `0db86e5e0c203f4c556e6764df0df68c391f9d634de5df2d0617d68b73c11cc8` for `oil-material.js` and `f5a8d52b99ab2dc41c0a81215d8254408193210608c8a6cd2ff64f0560f1f9f2` for `worlds.js`.

## Build and scope

All 18 existing automated tests passed after the final leaf geometry and canyon palette changes, covering the actual canyon route and geometry plus movement, collision and saved progression. The later change was confined to the leaf material variant and received separate browser/material verification. The final production build passed with `index-nekyEPTo.js` at 799.61 kB / 224.52 kB gzip. The configured 700 kB bundle advisory remains nonfatal. The full twelve-colour browser journey was not repeated for v18.

No generated image was added for this release. All new evidence and cover pictures are actual game photo exports. The retained generated sky's provenance remains in [sky-v16-prompts.md](../design/sky-v16-prompts.md).

After image packaging, both production builds passed again. The application and portfolio covers are byte-identical at 1600 × 1067 pixels, SHA-256 `77cb0bbbed25c0c4231ed3dda16aa8cc74ad7e325ad1afd96a39978436c7b77e`. The 900 × 1350 portrait portal uses the canyon photograph's 600 × 900 region beginning at x=400, with no stretching or generated replacement.

The supplied reference still has richer irregular paint accumulation, more varied silhouettes and a more coherent painted composition. Some foliage and cliffs still read as modeled or glazed forms; distant buildings and mountains remain fixed paintings. The broader quality goal remains open.
