# Canyon and paint verification — v16, 2026-09-10

v16 keeps the classic pigment/relief atlas and the v15 tree geometry. The tree and separate paint deposits now retain their authored colours with stronger stroke-value variation. Thickened closed botanical blades carry lengthwise brush ridges; shorter irregular bank loads and three cascades replace the canyon's earlier hanging sheets. The four worlds and twelve discoveries remain.

The canyon uses smaller matched colour/height coordinates and a denser near-bank mesh to reduce the large triangular foreground facets. A new impasto sky is selected for the canyon, with a blended overhead projection that removes the pinhole visible in its first trial. See the [material revision](../design/material-revision.md) and [sky provenance and inspection](../design/sky-v16-prompts.md).

## Completed checks

- `npm test`: all 18 tests pass, including canyon discovery/portal routes, terrain safeguards and river geometry.
- `npm run build`: passes. The final bundle is `index-AgnGANoa.js`, 794.05 kB / 222.62 kB gzip. Vite's configured 700 kB chunk-size advisory remains nonfatal.
- The final desktop run rendered all four worlds in High quality. Each reached ready state and recorded keyboard movement. The run recorded no page/console errors; its final page-health checks found no horizontal overflow or error panel. Two shader-driver warning entries remain recorded separately.
- All four worlds also reached ready state in the final 390 × 844 emulated touch viewport with Auto quality. The run recorded no page/console errors, and the inspected layouts showed no horizontal overflow or error panel.
- The final keyboard journey collected all twelve colours and restored all twelve after reload, with no recorded page/console errors. It used world-selection controls between worlds and checked that keyboard focus returned to the world canvas. It did not teleport the player or write the save data.
- Desktop and emulated mobile-layout control runs passed movement, drag-look, world selection, Low/High/Auto switching, PNG photo downloads and position reset, with no recorded page/console errors or layout overflow. They also exercised the audio button and motion checkbox. The audio-on button state was checked; audible output and the visual effect of disabling motion were not assessed.
- The final High-quality canyon exploration captured nine ready views using keyboard movement and drag-look: entrance, crown, west, south, east, zenith, middle cascade, near cascade and bank deposits. It recorded no page/console errors. The final screenshots include the refined near-bank grid and retained v15 tree; they sample these locations and directions rather than every possible viewpoint.
- The final v16 CPU integration audit passes finite geometry/instance data, matching displaced/rest coordinates, material/cache branches, blade UVs, canyon routes and resource lifetime checks. All 438 observed world-owned resources were disposed exactly once; 11 shared textures remained cached. Nine herb geometry variants across the exercised LODs have closed component topology. The record identifies the retained v15 tree, not the rejected union candidate, and includes hashes for 21 source/asset files.
- Near-bank sampling increased from 68 × 800 to a structured 164 × 1236 grid, concentrated around the nearby upper bank. In the sampled midpoint comparison against the same artistic displacement field, the p95 interpolation error fell from approximately 0.173 m to 0.026 m; the maximum after refinement was 0.223 m. This measures approximation of that field, not physical paint accuracy or a guaranteed error bound over the whole scene.

All five final browser jobs completed successfully. Earlier v15 results and rejected v16 candidate captures are not counted as verification of the frozen v16 runtime.

## Visual choice and limits

The experimental union crown remained rounded and candy-like in the actual scene, so its geometry was rejected. The retained v15 knife-edge crown uses the stronger v16 colour treatment. A canyon colour-transfer trial also erased too many visible mixed-pigment strands and was rejected; the canyon retains the classic atlas with its authored-dark colour gate.

The refined bank reduces coarse foreground triangles, but some deposits and the right cliff still appear rounded or marbled. The tree and plants remain visibly modeled, and the scene does not match the supplied reference's overall painted quality. The stochastic blend is continuous in value but can retain small slope/normal creases at triangle boundaries. The broader visual-quality goal remains open.

Plants, canyon, tree and nearby herbs are 3D; vegetation does not use crossed image cards. Distant castle and mountains remain fixed paintings on curved meshes, and their buildings cannot be entered. Sky and portal pictures are images. The sky's inspected trial directions show no obvious hard vertical seam, and the corrected zenith no longer shows the pinhole; this does not certify a seamless full sphere. Its overhead area uses a blended planar texture projection.

The relief is an artistic image-derived guide, not measured paint height or fluid simulation. Circular collision proxies cover important obstacles rather than every decorative surface. Sampled actual cliff/terrain upper joins retain small positive gaps: near-bank maximum 29.85 mm, far-bank maximum 16.49 mm, and forward far-bank maximum 13.39 mm. The CPU audit checks 1,162 near-bank and 726 far-bank upper samples against a 50 mm tolerance; it does not establish watertight terrain joins.

## Evidence scope

Final v16 evidence is packaged in [browser-verification.json](browser-verification.json) and the [CPU integration record](canyon-integration-verification.json), each with its own scope and limitations. The CPU audit does not execute GPU shaders, browser image decoding, texture mipmaps or visual appearance.

[Night](screenshots/world-0.webp) · [Garden](screenshots/world-1.webp) · [Canyon](screenshots/world-2.webp) · [Coast](screenshots/world-3.webp) · [Mobile canyon](screenshots/mobile-canyon.webp) · [Journal](screenshots/journal-complete.webp) · [Middle cascade](screenshots/canyon-middle-cascade.webp) · [Near cascade](screenshots/canyon-near-cascade.webp) · [Bank deposits](screenshots/canyon-bank-deposits.webp) · [Zenith](screenshots/canyon-zenith.webp).

Garden captures precede the refreshed canyon portal thumbnail; its deployed check belongs to the publication record. Local verification does not by itself establish the state of the public deployment.

The completed browser runs used Chromium/ANGLE on an NVIDIA GeForce GTX 1080 Ti. Short desktop High-quality samples recorded approximately 18.1 ms median frame intervals, with p95 around 18.3–18.4 ms for night/garden/canyon and 36.3–36.4 ms for coast. Timing applies to those sampled views and that machine, not steady performance across all views or devices. A physical-phone performance or touchscreen test has not been performed; the 390 × 844 emulated touch-layout checks use mouse input, including the joystick.

[Publication record](publication.md) · [Canyon image provenance](../design/canyon-impasto-candidate-prompts.md).
