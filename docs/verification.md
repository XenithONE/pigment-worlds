# Golden canyon verification — 2026-09-10

World 03 is now a walkable golden canyon. The connected banks roll over raised paint lips into a wide blue-and-ochre pigment river. A red-gold tree has a twisted solid trunk, roots, small branches and 1,440 thin painted leaves. Sculpted iris and wildflower drifts replace the large repeated flowers beside its path. A fixed original castle panorama and mountain-only side arcs complete its distant horizon. The four worlds and twelve discoveries remain.

## Checks

- `npm test`: 16 passing tests. The added checks exercise routes to all canyon discoveries and its portal, and sustained sprinting against the canyon rim.
- `npm run build`: succeeds; JavaScript is about 767 kB / 212 kB gzip. The configured 700 kB chunk advisory remains non-fatal.
- Actual keyboard walking collected all 12 colours and restored them after reloading. Diagnostics were read to plan routes; position and save data were not edited. World-selection focus was checked, including the fix that returns keyboard focus to the canvas after travel.
- Actual drag-look covered the canyon entrance, river overlook, tree, west, south and east. The 360-degree mountain backdrop showed no open horizon gaps. No page or console error occurred in this exploration.
- Independent CPU audits checked triangle orientation, finite geometry, instance transforms, quality-dependent botanical LOD, reachable collision/terrain routes, and one-time geometry/material/instance disposal. They supplement the browser checks rather than proving visual quality.

Final desktop and mobile-viewport screenshots, collected-colour evidence and observed timings are recorded in [browser-verification.json](browser-verification.json). Desktop/touch controls for sound, photo download, movement and drag also passed. High/Auto/Low quality, motion toggle and return to the entrance were exercised in the rebuilt canyon on both viewports.

## Visual evidence and limits

[Night](screenshots/world-0.webp) · [Garden](screenshots/world-1.webp) · [Canyon](screenshots/world-2.webp) · [Coast](screenshots/world-3.webp) · [Canyon on a mobile viewport](screenshots/mobile-canyon.webp) · [Completed journal](screenshots/journal-complete.webp).

These are actual browser renders. The portfolio cover comes from the in-game photo function. A separate experiment placed thousands of small surface-aligned paint strokes on rocks and paths. Two versions were rejected: they resembled pasted scales and did not justify their geometry cost. That experiment is excluded from the application.

The supplied reference still has finer, more irregular scenery and more convincing continuous oil-paint surfaces. The canyon tree, terrain and river remain visibly procedural in some views. Publication of this revision is not a claim of reference-equivalent quality or completion of the broader visual-quality goal.

The tested GPU is an NVIDIA GeForce GTX 1080 Ti through Chromium/ANGLE. Recorded frame times apply to this computer. A 390 × 844 touch viewport is not a physical-phone performance test. ANGLE emits non-fatal warnings in Three.js environment and AO/shadow shaders; no shader failure was observed.

Close plants, tree and canyon are 3D. Middle-distance flowers also use crossed image planes. Distant castle and mountains are static images on fixed curved meshes; their buildings cannot be entered. Sky and portal pictures are images too. The paint is artistic geometry and shading, not a physical fluid simulation. The steep-slope guard covers the night valley and golden canyon. Circular obstacle proxies cover important rocks and trunks rather than every decorative detail.

[Publication record](publication.md) · [Canyon image provenance](../design/canyon-vista-prompts.md).
