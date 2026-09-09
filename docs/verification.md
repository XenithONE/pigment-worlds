# Canyon and paint verification — v15, 2026-09-10

v15 keeps the original pigment/relief atlas with stronger 3D canyon deposits, shared stochastic texture coordinates and explicit texture gradients. The river opens into the entrance view, the tree frames the valley, and closed 3D herbs replace vegetation image cards in all four worlds. The four worlds and twelve discoveries remain. [Material revision](../design/material-revision.md) explains the implementation and source selection.

## Completed checks

- `npm test`: 18 tests pass, including canyon discovery/portal routes around the final tree and groves, terrain safeguards and the updated river geometry.
- `npm run build`: passes. The final classic-source JavaScript bundle is `index-CYk8n86f.js`, 784.08 kB / 218.86 kB gzip. Vite's configured 700 kB chunk-size advisory remains nonfatal.
- The completed classic-source desktop run rendered all four worlds in High quality and recorded keyboard movement in each. All reached a ready state, with no recorded page/console errors, horizontal overflow or error panel.
- All four worlds also reached ready state in the 390 × 844 emulated touch viewport with Auto quality, with no recorded page/console errors, horizontal overflow or error panel.
- An actual keyboard journey collected all twelve colours across the four worlds and restored all twelve after reload, with no recorded page/console errors. The test used world-selection controls between worlds and checked that keyboard focus returned to the world canvas; it did not teleport the player or write the save data.
- Desktop and mobile-layout control runs passed movement, drag-look, world selection, Low/High/Auto switching, PNG photo downloads and position reset. They also exercised the audio button and motion checkbox, with no recorded page/console errors or layout overflow. The audio-on button state was checked; audible output and the visual effect of disabling motion were not assessed.
- The final High-quality canyon exploration captured six ready views—entrance, river overlook, tree/castle, west, south and east—using movement and drag-look controls, with no recorded page/console errors. This samples those locations and directions rather than every possible viewpoint.
- The final v15 CPU integration audit passes finite geometry/instance data, canyon routes, material variants and resource lifetime checks. All 456 observed world-owned resources were disposed exactly once; 11 shared textures remained cached. Nine herb geometry variants across the exercised LODs have closed component topology.

All five final classic-source browser runs completed successfully. Results from the rejected loaded-source runs and previous v14 are not counted as v15 verification.

## Visual choice and limits

A paired comparison with the same final geometry favoured the original **classic** atlas over the new loaded-paint source. Classic retains visible rolled paint edges and flowing highlights on the cliffs and path; the loaded source still resembled coloured rock and was rejected. The larger deposits, opened river, revised tree and vegetation changes remain.

The right cliff still has a rounded large-scale shape, some surface marks repeat, and the tree remains visibly modeled. The stochastic blend is continuous in value but can retain small slope/normal creases at triangle boundaries. These changes do not establish full fidelity to the supplied reference; the broader visual-quality goal remains open.

The plants, canyon, tree and nearby herbs are 3D; vegetation no longer uses crossed image cards. Distant castle and mountains remain fixed paintings on curved meshes, and their buildings cannot be entered. Sky and portal pictures are images. The relief is an artistic image-derived guide, not measured paint height or fluid simulation. Circular collision proxies cover important obstacles rather than every decorative surface.

Sampled cliff/terrain joins have small positive gaps: the forward near-bank maximum is 5.54 mm and the forward far-bank maximum is 24.34 mm. The largest sampled gap anywhere is 42.65 mm behind the spawn. The CPU audit uses a 50 mm tolerance; it does not establish watertight terrain joins.

## Evidence scope

Final evidence is packaged in [browser-verification.json](browser-verification.json) and the [CPU integration record](canyon-integration-verification.json), each with its own revision and limitations. [Night](screenshots/world-0.webp) · [Garden](screenshots/world-1.webp) · [Canyon](screenshots/world-2.webp) · [Coast](screenshots/world-3.webp) · [Mobile canyon](screenshots/mobile-canyon.webp) · [Journal](screenshots/journal-complete.webp).

The garden captures precede the final canyon portal-thumbnail refresh; its deployed check belongs to the publication record. Shader-driver warnings are retained in the browser evidence.

Browser runs use Chromium/ANGLE on an NVIDIA GeForce GTX 1080 Ti. The 390 × 844 emulated touch layout was operated with mouse input, including its joystick. This is not a physical-phone performance or touchscreen test. Recorded timing and render counts apply only to the tested views and machine.

The short desktop High samples recorded approximately 18.2 ms median frame intervals. Their p95 values were 18.3 ms for night/canyon, 36.1 ms for garden and 36.3 ms for coast. These observations do not establish steady performance across all views or devices.

[Publication record](publication.md) · [Canyon image provenance](../design/canyon-impasto-candidate-prompts.md).
