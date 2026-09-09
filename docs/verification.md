# Painted landscape verification — 2026-09-10

The four-world exploration uses physical paint layers, continuous half-float brush relief, coloured folds, grazing light, shadows, GTAO and HDR/MSAA. This revision adds sculpted iris/wildflower drifts with three geometry levels, finer grass blades, physical relief on the path, a connected six-layer riverbank, cliff-aware movement and water reflection in the night world. Fixed distant scenic paintings enrich the night village and garden; a finer night sky matches their brush scale. All four worlds and twelve colour discoveries remain.

## Checks performed

- `npm test`: fourteen tests pass, covering saves, collection/restore, movement limits, rock collisions, steep slopes, narrow drops, contour sliding, combined rock/terrain guards and access to the actual valley discoveries.
- `npm run build`: succeeds. Bundled JavaScript is about 748 kB uncompressed / 205 kB gzip. Vite reports its configured 700 kB chunk-size advisory; this is not a failed build.
- Actual keyboard traversal collected all twelve colours across the four worlds and restored all twelve after reload. The automation read diagnostics to plan routes but used keyboard input to walk and collect; it did not teleport or edit progress.
- Desktop and touch-viewport controls passed for walking, drag-look, audio on/off, PNG photo download, world selection, low/high/auto quality, motion toggle and return to the entrance.
- Final integrated art captures cover all four worlds at 1536 × 1024. Mobile captures use 390 × 844. No page/console error, horizontal overflow or error overlay was recorded in these checks.
- Resource disposal, atlas-loading order and quality-switch behaviour were reviewed independently. All 17,952 connected cliff triangles face the river, with no degenerate triangles or non-finite values; 940 adjacent band boundaries match exactly. Geometry/material disposal passed. Botanical and path-relief geometry also passed finite/disposal checks. Earlier poured-sheet and boat checks remain applicable to those unchanged helpers.

The in-app browser was used to inspect and operate the actual app. Bundled Playwright Chromium supplemented it for held keys, touch-viewport controls, downloads and repeatable captures. Raw results are summarized in [browser-verification.json](browser-verification.json).

## Actual visual evidence

[Night](screenshots/world-0.webp) · [Garden](screenshots/world-1.webp) · [Gold](screenshots/world-2.webp) · [Coast](screenshots/world-3.webp) · [Mobile](screenshots/mobile-playing.webp) · [Completed journal](screenshots/journal-complete.webp).

The reference and concept were compared with real browser captures. This revision replaces repeated nearby daisies with complete sculpted plants, coordinates distant landscape and sky brush scales, and raises actual pigment on the path. A stronger directional painting filter was compared in the browser and rejected because it blurred existing painted detail. A coloured fringe in the garden image was rejected and replaced. Independent poured wall strips were replaced by a connected surface after side-view inspection exposed their rectangular boundaries.

These captures show the implemented result, not an image-generation mockup. The portfolio cover is the game's own photo output. The image references still have greater landscape intricacy and less procedural repetition; this report does not claim reference-equivalent visual fidelity.

## Practical limits

The tested renderer was Chromium/ANGLE on an NVIDIA GeForce GTX 1080 Ti. Timing, triangle and draw counts are in the JSON and are observations of this workspace, not guarantees for other devices. Reflecting a scene submits it again; those triangles are included in the measurements. A mobile viewport on this computer is not a physical-phone performance test. Windows ANGLE emitted non-fatal warnings in Three.js environment filtering and AO/shadow compilation, with no shader failure observed.

Near vegetation and paint cliffs are three-dimensional; middle-distance botanical detail also uses lit, alpha-cutout crossed planes. Night/garden vistas are generated static images on fixed curved surfaces and are not traversable architecture. Sky and portal paintings are also generated images. Paint relief is an artistic height interpretation, not a measured surface. Water reflection assumes a plane, and flowing paint is animated geometry/shading rather than fluid simulation. The new steep-slope guard applies to the night valley; collision proxies cover substantial rocks and trunks, not every scene detail or interiors.

Publication and live checks are recorded in [publication.md](publication.md).
