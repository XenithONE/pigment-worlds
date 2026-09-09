# Plant verification — v17, 2026-09-10

The selected v17 plant revision includes three runtime source files and the generic-leaf/grass extension in `worlds.js`. Local verification is complete; deployment is recorded separately in [publication.md](publication.md). The completed [v16 verification](verification.md) remains historical evidence for that release; its five browser jobs are not relabelled as v17 checks.

## Change under review

`botanical-sculptures.js` gives the closed blades flatter broad faces, asymmetric rolled rims and dragged ridges. Stems receive a flattened section, and their vertex colours follow the authored raised shapes. Placement and LOD selection are unchanged.

For meshes carrying `pigmentBladeUV`, `oil-material.js` now samples one continuous interior atlas region in blade UV coordinates. Colour and broad relief use matching coordinates; the authored plant colour receives the stroke's value variation, with clearcoat concentrated around a lip. This branch uses two texture fetches per fragment in the source, while other surfaces retain their spatial mapping. This is not a measured GPU performance result. The program cache key has a v17 revision and continues to distinguish blade, ordinary, anchored and stochastic variants.

The subsequent `worlds.js` extension tags batches built from the existing leaf and grass geometries for that shader. Compact LODs gain folded periodic UVs so the cosine-based brush coordinate agrees around their welded perimeter. Positions, indices, normals, density and placement are unchanged by this extension.

The atlas relief is an artistic image-derived guide, not measured paint height. The geometric blade folds and the shader's finer guide are separate scales of detail.

## Completed CPU review

The local `flora-v17-audit.mjs` run passed; its result is retained in [plant-geometry-verification-v17.json](plant-geometry-verification-v17.json). A separate `generic-blades-v17-audit.mjs` run passed for the later extension, with its result in [plant-leaf-verification-v17.json](plant-leaf-verification-v17.json). All three changed JavaScript files also passed `node --check`.

- 81 deterministic geometry cases: 45 botanical and 36 herb cases across the factory variants and three detail levels.
- 3,060 separately closed components, 489,630 triangles and 3,162,951 finite attribute values. Every checked component had positive signed volume and matching edge winding. No triangles collapsed under the audit's position quantisation.
- Used normals ranged from approximately 0.999999954 to 1.000000047 in length. UV counts matched position counts.
- The actual garden helper produced 122 meshes; the probes observed 24 LOD geometries with valid blade flags and UVs. Two generated oil material variants were exercised. Shared-source ordinary foliage and blade materials received different objects and program keys.
- The first two diffs introduce no new resource owners. Existing geometry/material disposal paths remain in place, and the exercised flora groups were absent from the scene after disposal. That factory run did not count every dispose event or measure GPU memory.

The extension audit compared ten representative factory outputs with the committed pre-extension source: position, index and normal arrays were byte-identical, with finite UVs matching every position. Across the compact rings, the maximum folded-cosine interpolation difference was approximately 5.43 × 10⁻⁸. The field's value difference at 37 coincident seam pairs was zero. This verifies sampled value continuity, not GPU derivative continuity or invisible LOD transitions.

The audit then created all four actual worlds and exercised High/Auto/Low plus coarse-pointer branches. Night/garden/canyon each exercised leaf and grass at all three LODs; coast exercised all three leaf LODs. The number of tagged generic batches was respectively 87, 132, 71 and 57. Every observed target geometry retained valid UVs, and each mixed original `brushMat` produced separate blade and ordinary shader variants. All 385 tracked extension resources were disposed exactly once, and the original materials were restored. This resource count covers the extension probes, not all resources in a fully rendered world.

No significant correctness defect was identified in the reviewed diffs. The shader hook checks do not compile or link GPU programs. The factory adapter exposes private generators and retains their source parts for inspection; it does not change generated positions, indices, normals or UVs. Separate closed flowers and stems may overlap and are not a single boolean-unioned volume.

Raw source hashes recorded by these runs:

| Source | SHA-256 |
| --- | --- |
| `src/render/botanical-sculptures.js` | `82c7f5e11e4486b77bcb8a65c7f71375c23c48639185d5edffe177be86f21820` |
| `src/render/oil-material.js` | `fd4021d67d3b6264beeefbf9a074b8c227988f86343f4643eb949aa02615f7f7` |
| `src/render/pigment-herbs.js` | `3b07afa13ce03f3d71bbf62fa707a6e2630bcd280f84c5e12de6431fb533d8c9` |
| `src/render/painted-flora.js` | `3cda21fd354556b6fb2045c4d4a95baecec181d0aaebab8c71d60f5767d12c2b` |
| `src/render/worlds.js` | `69ee23c66feabaa41d9b1bd6f29bb437eb90ee2facde46b3fceaeb2a2c85a413` |

## Completed browser and build checks

After the final generic-leaf/grass extension, the in-app browser was reloaded at `http://127.0.0.1:5188/`. At 1280 × 720, the night entrance and the garden, canyon and coast scenes all rendered. The garden was inspected after real W-key movement and drag-look; its nearer small flowers and grass were photographed with the game's photo button. A separate final canyon entrance photograph was also saved. The tab's final error log was empty, and no framework error overlay appeared in the inspected views. Scene transitions sometimes exceeded the UI tool's response timeout; subsequent state reads and screenshots confirmed the rendered scenes without repeating the world-selection action.

The coast was also inspected at a temporary 390 × 844 viewport. The canvas matched those dimensions, document width was 390 pixels with no horizontal overflow, and the mobile controls were visible. The quality selector was changed from High to Low and back to High, with rendered scene checks and no recorded errors. The viewport override was reset afterward. This is a small-screen layout/quality check, not a physical-phone, touchscreen, frame-rate or full mobile journey test.

Both final source changes and the leaf extension passed all 18 existing tests and a production build. The final JavaScript bundle is `index-Dj5-gcAX.js`, 796.90 kB / 223.55 kB gzip. The configured 700 kB chunk-size advisory remains nonfatal. No v17 full twelve-colour browser journey is claimed; movement, storage and routes retain their automated tests, while the full twelve-colour browser journey belongs to v16.

The garden photo operation initially exceeded the UI tool's download-event wait, but the game showed its saved-photo message and the PNG was present in the browser's download directory. That actual image was inspected and converted for the evidence below; the timeout was not treated as proof of download failure or success by itself.

## Visual selection and limits

The first analytic blade field made regular smooth stripes; a second spatially blended field remained too subtle. The selected version samples a complete dragged atlas region directly along each blade. The [iris close-up](screenshots/plant-v17-garden-near.webp) shows irregular broad raised-looking loads and long valleys rather than uniformly smooth petals. An independent image review supported retaining that improvement and found no obvious holes, missing faces or severe spikes in the inspected plants. It was captured before the generic-leaf extension, with the same final botanical geometry and oil shader, and is evidence for those plants rather than the subsequent generic-leaf changes. Different camera distances mean this is not a strict quantitative comparison with v16.

The final combined [garden grass and small flowers](screenshots/plant-v17-garden-grass.webp) and [canyon entrance](screenshots/plant-v17-canyon.webp) were captured after the leaf extension. The application cover and portfolio cover use the same actual canyon photograph; the portrait portal crop keeps its tree and river. Their SHA-256 is `81a30ee7be548c25cc3fa5885a3e332aebd62b0f046dc56d7214a3b04b4edc4c` for the shared landscape cover.

Fine points of light and a modeled or clay-like appearance remain in some petals. The larger leaves keep their previous geometry; only their shader coordinates and material branch changed. The world is not at the supplied reference's overall painted quality, and the broader visual-quality goal remains open. Current public deployment evidence is in [publication.md](publication.md).
