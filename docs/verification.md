# PIGMENT verification — 2026-09-09

The final local build passed the journey tests, a complete browser traversal, and visual inspection of all four painting worlds. Browser automation reported no page errors or failed resource loads. The exact collected-state evidence is in [browser-verification.json](browser-verification.json).

## Actual browser checks

The Codex in-app browser was used first for launch, the initial composition, starting the journey, and the world chooser. Its canvas continuous-key API did not support the required walking sequence, so the bundled Playwright Chromium browser was used for sustained key presses, downloads, reproducible viewport captures, and collection checks. The automation used real keyboard, pointer and button interactions; it only read the development diagnostic snapshot and did not teleport the player or modify collection state.

- Desktop at 1536 × 1024, the same dimensions as the generated concept.
- Mobile viewport at 390 × 844. This is browser viewport testing, not a physical-phone performance claim.
- Initial loading completes, every sky and portal painting loads, and start removes the large introduction.
- Holding W changes the player position. Shift plus WASD walks to all 12 pigments through the actual movement loop. Every pigment is collected once.
- All four worlds open; a nearby frame moves the player from the first world to the second.
- The complete 12-color journal opens. After reloading, all 12 collected colors are restored.
- Audio toggles on and off with the correct pressed state. A PNG photo download contains the rendered scene.
- Low/high quality settings work. Scenery-motion controls work; returning to an entrance resets position.
- The mobile movement circle changes the player position. World selection, introduction and play views fit without horizontal overflow.
- Three Node tests pass: malformed save normalization; complete, duplicate-safe collection and restore; movement normalization, frame cap and boundary.

The Windows ANGLE compiler emitted a non-fatal precision warning while compiling Three.js environment-map filtering. No shader program failure or visible missing material occurred. The earlier failed external font requests were fixed by bundling both fonts locally. The earlier variable-loop filter warning was removed by unrolling the paint filter.

## Visual comparison and repairs

Both [the Image Gen concept](../design/concept.png) and final browser screenshots were opened with `view_image` in the same review pass. Screenshots cover [desktop start](screenshots/start-desktop.webp), [night](screenshots/world-0.webp), [garden](screenshots/world-1.webp), [gold](screenshots/world-2.webp), [coast](screenshots/world-3.webp), [mobile start](screenshots/mobile-start.webp), [mobile play](screenshots/mobile-playing.webp), [mobile chooser](screenshots/mobile-worlds.webp), and [completed journal](screenshots/journal-complete.webp).

| Comparison | Result and repair |
| --- | --- |
| Layout and visual hierarchy | Full-bleed explorable scene, logo top left, three quiet controls top right, introduction lower left, portal to the right. Playing removes the introduction and keeps compact progress only. |
| Visible copy | PIGMENT / 絵の向こうへ / 世界を選ぶ / 音 OFF / ? / 絵の向こうへ、歩いていこう。 / 星のうねり、睡蓮の光。 / 筆のあとに、道がつづく。 / 旅をはじめる / 01 / 04 / 星月夜の丘 are retained. No added marketing badge or section. Mobile replaces the desktop keyboard hint with a touch hint. Loading text disappears after readiness. |
| Typography | Locally bundled Cormorant Garamond and Noto Serif JP retain the fine serif direction. Mobile logo and navigation were resized so controls stay on one line. |
| Palette and lighting | Night uses ultramarine and gold; other worlds have distinct mint, gilded ochre and pearly-fog palettes. Dark foreground side faces were lifted with blue/warm fill. |
| Paint surface and objects | Early planar petals, spear-like leaves and hard geometry were replaced with closed curved daubs, thick petals, rounded rocks and softened architecture. Spatial pigment ridges, clearcoat and painterly filtering unify the objects. |
| Path | Early dark chips read as gravel. They were replaced by broad, connected gold/ochre palette-knife smears following the path, with actual tapered relief. |
| Portal and asset treatment | The early sky-only inset was replaced with an original landscape painting of the next world. The geometry remains a traversable gold frame. |
| Spacing and responsiveness | Desktop edge margins and sparse overlay hierarchy match the design direction. Mobile framing turns slightly toward the portal; touch controls appear only when playing. |

The still concept is not a literal 3D geometry blueprint. The final authored village, vegetation and skies have different exact shapes. The user explicitly requested a stronger viscous-oil treatment after seeing the first playable scene; the final geometry and material revisions follow that direction. These intentional differences, plus game-required journal/loading/settings/touch states, are recorded in [design-system.md](../design/design-system.md). UI composition, wording, typography and interaction hierarchy were checked against the concept; the actual world is an original real-time implementation, not a claimed pixel-identical reproduction of the generated still.

## Rendering scope and limits

Spatial cells and three geometry-detail levels preserve rich nearfield daubs while simplifying distant vegetation. The final desktop high-quality spawn captures submitted about 0.85–1.77 million triangles and 206–243 draw calls including postprocessing. These are scene-specific measurements on this computer, not frame-rate guarantees for other devices. The `frameMs` field in the development snapshot is an adaptive-quality hint and is not used as a cross-world benchmark.

The painting effect uses real geometry plus procedural spatial surface detail and an anisotropic low-variance image filter. It approximates the appearance of oil paint; it does not simulate pigment chemistry or viscous fluid dynamics. The skies and portal previews are original generated paintings. Water uses an artistic reflection shader. Terrain-following exploration supports the bridge and world boundary, while general prop collision and interiors are outside this work's scope.

Technical references: [Three.js materials and renderer documentation](https://threejs.org/docs/), [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Publication

The repository includes a GitHub Actions workflow that runs the tests and build before deploying `dist/`. The UNFILED cover comes from the game's actual PNG photo output, compressed as WebP. Live deployment verification is recorded separately after publication.
