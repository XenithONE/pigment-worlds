# Material and canyon revision verification — v14, 2026-09-10

The four worlds retain their twelve discoveries. This revision aligns pigment colour with sculpted relief, restores stronger cobalt/ochre paint values, deepens the continuous canyon faces, and adds terrace groves with route-aware collision proxies. [Material revision](../design/material-revision.md) records the implementation and rejected experiment.

## Completed checks

- `npm test`: 16 tests pass, including routes to the canyon's three colours and portal around the tree and new groves, and sustained sprinting against the canyon rim.
- `npm run build`: succeeds; JavaScript 778.17 kB / 215.92 kB gzip. The configured 700 kB chunk advisory remains non-fatal.
- The [CPU integration audit](canyon-integration-verification.json) passes with the decoded relief field, anchored material variants, grove collision routes and 409 observed owned resources disposed exactly once. It retains 12 shared textures. Two zero normals belong only to unused pole vertices; GPU upload/linking and temporary unattached resources are outside this audit.
- v14 desktop captures visited all four worlds in High quality. Each reached a ready state and recorded actual keyboard movement. No page/console error, error panel or horizontal overflow was recorded.
- v14 390 × 844 touch-viewport captures visited all four worlds in Auto quality without page/console errors, an error panel or horizontal overflow. These captures establish rendering and layout; movement controls are checked separately.
- The v14 keyboard journey collected all twelve colours and restored all twelve after reload, with no recorded errors. Diagnostics were read for route planning; position and save data were not edited. Travel through the world selector returned keyboard focus to the canvas.
- Desktop and emulated touch-viewport controls passed movement, drag-look, sound-toggle state, photo download, Low/High/Auto selection and return to the canyon entrance. The motion option was also exercised. Pointer-driven joystick movement was tested in the touch viewport; this was not a physical touchscreen test.
- Six fresh canyon views covered the entrance, river overlook, tree/castle, west, south and east using keyboard movement and drag-look. All remained ready, with no recorded page/console errors or visible open horizon gaps in the inspected views. These samples are not exhaustive coverage of every location or angle.

## Evidence and visual limits

Packaged evidence: [browser-verification.json](browser-verification.json). [Night](screenshots/world-0.webp) · [Garden](screenshots/world-1.webp) · [Canyon](screenshots/world-2.webp) · [Coast](screenshots/world-3.webp) · [Mobile canyon](screenshots/mobile-canyon.webp) · [Journal](screenshots/journal-complete.webp). Raw v14 runs are retained in the local QA workspace; the packaged record identifies each run's scope.

The desktop entry set precedes only the final smooth cliff-join taper; mobile captures and the final directional inspection include it. The packaged canyon screenshot and portfolio photo cover use the entrance from that final inspection. Garden captures precede refreshing the canyon portal thumbnail, so that final thumbnail is outside their verification scope.

Actual browser views show richer paint colour and more visible cliff detail than the previous revision. Some ground and cliff surfaces still read as repeated decorative patterns; their smooth large shapes lack the reference's irregular rolled paint edges. The large central tree and flower beds partly obscure the river from the entrance. The tree's twisted trunk and separate leaves also remain visibly modeled. This revision does not establish reference-equivalent visual quality.

The tested GPU is an NVIDIA GeForce GTX 1080 Ti through Chromium/ANGLE. Desktop High captures recorded roughly 18.1–18.2 ms median and 18.3 ms p95 frame intervals on this computer; these are short local observations, not hardware-independent performance guarantees. A touch viewport is not a physical-phone test. ANGLE recorded non-fatal shader warnings; no shader failure was observed.

Near plants, tree and canyon are 3D. Middle-distance flowers also use crossed image planes. Distant castle and mountains are fixed paintings on curved meshes; their buildings cannot be entered. Sky and portal pictures are images. Relief is artistic geometry and shading, not physical paint-fluid simulation. Collision proxies cover important rocks, trunks and nearby groves rather than every decorative detail.

[Publication record](publication.md) · [Canyon image provenance](../design/canyon-impasto-candidate-prompts.md).
