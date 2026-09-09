# Impasto rebuild verification — 2026-09-09

The four-world exploration was rebuilt with physical paint layers and poured sheets, continuous half-float brush relief, material-specific pigments, darker coloured folds, grazing light, shadows, GTAO, HDR/MSAA and planar water reflections. The original four worlds and twelve-colour journey remain. This report supersedes the earlier release's rendering measurements.

## Checks performed

- `npm test`: five tests pass, covering malformed saves, duplicate-safe collection/restore, movement limits, swept rock collisions and sliding.
- `npm run build`: succeeds. Bundled JavaScript is about 725 kB uncompressed / 196 kB gzip. Vite reports its configured 700 kB chunk-size advisory; this is not a failed build.
- Actual keyboard traversal collected all twelve colours across the four worlds and restored all twelve after reload. The automation read diagnostics to plan routes but used keyboard input to walk and collect; it did not teleport or edit progress.
- Desktop and touch-viewport controls passed for walking, drag-look, audio on/off, PNG photo download, world selection, low/high/auto quality, motion toggle and return to the entrance.
- Final integrated art captures cover all four worlds at 1536 × 1024. Mobile captures use 390 × 844. No page/console error, horizontal overflow or error overlay was recorded in these checks.
- Resource disposal, atlas-loading order and quality-switch behaviour were reviewed independently. Sixty poured-sheet geometry cases passed finite-normal/position and closed-manifold checks; boat geometries passed finite/index checks.

The in-app browser was used to inspect and operate the actual app. Bundled Playwright Chromium supplemented it for held keys, touch-viewport controls, downloads and repeatable captures. Raw results are summarized in [browser-verification.json](browser-verification.json).

## Actual visual evidence

[Night](screenshots/world-0.webp) · [Garden](screenshots/world-1.webp) · [Gold](screenshots/world-2.webp) · [Coast](screenshots/world-3.webp) · [Mobile](screenshots/mobile-playing.webp) · [Completed journal](screenshots/journal-complete.webp).

The reference and concept were visually compared with real browser captures throughout the rebuild. Main corrections were: replacing dotted 8-bit height gradients with continuous half-float relief; reducing common blue/ochre marbling on flowers and architecture; grouping and deforming thick foliage; narrowing the trail; adding layered terrain, viscous sheets, real water reflections, textured mountains and more complete boats. Nearby flowers and rocks were also compared at different material settings using the same lights and camera.

These captures show the implemented result, not an image-generation mockup. The portfolio cover is the game's own photo output. The image references still have greater landscape intricacy and less procedural repetition; this report does not claim reference-equivalent visual fidelity.

## Practical limits

The tested renderer was Chromium/ANGLE on an NVIDIA GeForce GTX 1080 Ti. Timing, triangle and draw counts are in the JSON and are observations of this workspace, not guarantees for other devices. Reflecting a scene submits it again; those triangles are included in the measurements. A mobile viewport on this computer is not a physical-phone performance test. Windows ANGLE emitted non-fatal warnings in Three.js environment filtering and AO/shadow compilation, with no shader failure observed.

Near vegetation and paint cliffs are three-dimensional; middle-distance botanical detail also uses lit, alpha-cutout crossed planes. Sky and portal paintings are generated images, and distant mountain meshes project part of the sky artwork. Paint relief is an artistic height interpretation, not a measured surface. Water reflection assumes a plane, and flowing paint is animated geometry/shading rather than fluid simulation. Collision proxies cover substantial rocks and trunks, not all scenery or interiors.

Publication and live checks are recorded in [publication.md](publication.md).
