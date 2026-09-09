# Canyon distant landscape experiment

World 03 is a walkable oil-paint canyon. These assets
provide distant scenic paintings only; the painted castle and distant bridges
are not traversable models. The near cliff, path, river and tree are separate
real 3D geometry owned by the main scene implementation.

## Production files

- `public/art/vistas/canyon-vista.webp`: original 2172 × 724 RGB painting, WebP quality 95, 774194 bytes.
- `public/art/vistas/canyon-ridgeline.json`: 2172 numerical skyline samples derived from a generated black/white mask, one per source column.
- `public/art/golden-sky.webp`: final adopted 1774 × 887 restrained afternoon sky, 327814 bytes. Root reviewed the candidate and copied it over the runtime sky while preserving the existing `golden-sky` identifier and portal name. The duplicate candidate was moved outside the application to `.qa-pigment/rejected-vista-assets/canyon-sky-candidate.webp`.
- `src/render/canyon-vista.js`: independent fixed-world curved mesh renderer. North panorama defaults: radius 210 m, 120° arc, image height 150 m, bottom −35 m, origin (0,0,0). Four additional mountain-only arcs complete 360° around the horizon. No camera-follow behavior. Near-only fade 60–80 m never activates within the ±58 m playable square at the default radii; minimum possible distance exceeds 127 m. Fine skyline geometry preserves individual spires, with a narrow top feather. Overlapping sides and submerged bottoms feather into the scene.

`await loadCanyonVista()` loads and caches the texture plus JSON. Call
`addCanyonVista(scene, options)` after loading. It returns `{group, dispose}`.
The optional fields are `origin`, `radius`, `arc`, `height`, `bottom`, `yaw`,
`atmosphere`, `tint`, `opacity`, and `feather`. `dispose()` is idempotent and
releases the instance geometry/material while preserving the cached texture.

## Provenance

All three images were generated with the built-in `image_gen.imagegen` tool.
No paid external service was used. Generation folder:
`C:/Users/spkf8/.codex/generated_images/01a08637-5732-7e91-899a-9ec534ff96b2/`.
Source PNGs are preserved in `design/source-images/`. Runtime conversion only
compresses the original image to WebP; it does not repaint or synthesize pixels.
The mask is used as numerical geometry input by `derive-canyon-ridgeline.py`.
The generator left some erroneous black holes inside the castle mask; tracing
only the outer first-white skyline intentionally ignores those internal holes.
At source columns 1515–1624 the generated mask also shifted thin castle roofs.
The numerical derivation instead follows the original dark roof outline against
the pale sky in that bounded region. This adjusts mesh coordinates only.

### Canyon painting

Tool output: `exec-663266fe-16fe-4554-8ef1-f37618f9c608.png`.
Source: `design/source-images/canyon-vista-source.png`.

Prompt:

> Use case: stylized-concept. Asset type: one original production panoramic distant environment painting for an explorable 3D oil-paint fantasy canyon. Very wide 3:1 aspect ratio, highest resolution, exceptionally intricate museum-quality original oil painting, full bleed, no frame or text. A vast late-afternoon alpine river gorge opens into layer after layer of sublime high blue-gray jagged mountains and golden cliffs. In the CENTER-RIGHT, at about 65 percent image width, an extraordinary tall fairytale castle with many precise slender gothic spires, pointed turrets, long buttresses, tiny windows, golden-lit stone galleries and an arched stone viaduct stands on a high sheer ochre and cobalt cliff. The castle must be the beautifully legible narrative focal point, with many individually articulated architectural forms, not a generic tiny blob. A winding turquoise-cobalt river begins across the wide bottom center and converges toward a narrow central distant valley at about 48 percent image width; multiple slender elegant ancient stone arch bridges cross the receding gorge at different depths, connecting ledges with tiny villages and cypress groves. The LEFT half includes towering slate-blue mountain crags with ivory sunlit ridges and wooded terraces; the RIGHT half includes the raised spired castle cliff, a taller jagged blue-gray mountain behind it, and gold cypress woodland terraces. Landscape fills about 75 percent of the image, quiet sky the top 25 percent: pale warm ivory, muted blue-gray and a few delicate rose-colored late afternoon clouds, no giant sun or giant swirls. Deep rich cobalt, indigo and teal in shadowed rock clefts and river, warm ivory and ochre late-afternoon sunlight across knife edges, restrained touches of rose and terracotta, tiny accents of metallic-looking gold leaf reminiscent of a Klimt palette. Every distant cliff stratum, tree crown, small roof, arch and spire is finely described with precise visible brush shapes. Visibly thick layered hand-painted oil pigments and glistening impasto ridge highlights, but detail remains coherent and majestic, no uniform embossed noise or plastic CGI. Strong large-scale atmospheric depth: warm near terraces, richly blue middle mountains, soft pale far ridges. View is from far across the valley: NO close foreground giant rocks, NO oversized foreground trees or flowers, NO people, NO signs, NO paper plaque, NO objects framing the camera. The bottom 12 percent is dark teal-blue water and shadowed rocky banks with soft descending detail so it can meet a real 3D river. Architectural and tree scales must be consistent throughout. NOT a screenshot, NOT concept UI, not photorealism. No text, no watermark, no border. Dense fine visual storytelling in the distant castle, bridges and mountain villages.

### Geometry mask

Tool output: `exec-f0649234-3d33-4439-93c0-bac84126f0a5.png`.
Source: `design/source-images/canyon-vista-mask-source.png`.
Referenced image: original canyon painting.

Prompt:

> Use case: precise-object-edit. Produce a precise binary opacity MASK of the supplied panorama, preserving exact pixel alignment, width, height and composition. This is a technical black-and-white mask, not a new landscape and not transparency. Replace all SKY pixels with pure BLACK (#000000). Replace all mountains, land, castle, its very thin tall spires, trees, buildings, bridges, river and foreground below the visible outer landscape silhouette with pure WHITE (#ffffff). The white region starts at the exact mountain skyline or castle-spire silhouette and continues solid white all the way down to the bottom edge; there must be NO internal black shading or windows or texture in the white region. Only the outside sky is black. Carefully preserve the small pointed spire tips, including the tallest castle spire near 72 percent of image width and the high mountains near the left and far right. Do not add peaks or smooth away peaks, do not change the silhouette, do not shift or rescale anything. Output fully opaque RGB or grayscale black-and-white mask with lightly antialiased one-pixel edges, no checkerboard, no text, no border. Same exact 3:1 dimensions as the supplied image.

### Matching afternoon sky

Tool output: `exec-e2c2c712-b99f-471f-8df8-c92962b2cb3c.png`.
Source: `design/source-images/canyon-sky-source.png`.
Final runtime adoption: `public/art/golden-sky.webp` (root integration).

Prompt:

> Use case: stylized-concept. Asset type: production original equirectangular 360-degree oil-painted afternoon SKY environment panorama for an alpine fantasy canyon. Very wide 2:1 image, highest resolution, no text, no frame. Restrained elegant late afternoon atmosphere: luminous warm ivory light, pale cobalt-gray blue open sky, delicate low-contrast cream and muted rose clouds. Very fine confident layered oil brushwork and subtle impasto highlights, small precise brush shapes coherent with a highly detailed painted castle and blue-gray mountains below. The sky should support the landscape, not overpower it. Scattered softly structured cloud banks, gentle horizontal light near the lower horizon, no giant sun disk, no orange sunset, no saturated red cloud bank, no purple fantasy nebula, no giant spirals, no starry night. Predominantly silvery cobalt-gray blue and warm ivory, with restrained pale dusty rose cloud accents only. A tiny faint warm glow high enough to light cliffs, but no visible sun required. Bottom 10 percent a quiet pale bluish ivory haze with no buildings, trees or discernible mountains; almost all sky. Authentic original oil painting, clear brush marks without chaotic texture noise, not a photograph, not CGI, not flat smooth digital gradient. Seam-compatible left and right edges and calm polar areas for an equirectangular environment map. Full bleed.

## Visual limitation

The distant painting uses finer, more natural rock detail than the viscous
foreground reference. Its intended role is atmospheric narrative scale. The
foreground must carry actual thick paint relief. The side/rear arcs reuse
mountain portions of the original painting with varied crops, height and UV
direction; an attentive viewer may recognize repeated peaks. The castle only
appears in the north panorama. Integration framing remains the main scene's
responsibility.

## Validation

- Node syntax check passed for the new renderer.
- Actual Chromium/WebGL fixture rendered entry, left and right playable corners,
  a castle close view, and castle silhouettes against black and middle gray.
  Final screenshots: `C:/Users/spkf8/Desktop/Project/.qa-pigment/canyon-vista-calibration/`.
- The original generated mask's shifted spire caused a pale diagonal sky strip
  in the first close view. The bounded numerical source-outline correction
  removed that strip; the final black/gray checks retain the narrow dark roof.
- 4344 vertices / 4342 triangles. Transparent double-sided rendering currently
  makes 2 draw calls and reports 8684 drawn triangles. There is no per-frame
  geometry update. No JavaScript or shader failures occurred; the isolated
  fixture recorded only the absent favicon's HTTP 404.
- The fixed landscape remains visible from both ±58 m northern corners.
  The initial single panorama's isolated side endings were visible in open sky.
  The four surrounding mountain arcs described below address that limitation.
- Root's initial `canyon-v13-preview/world-2.png` shows a coherent sky/landscape
  junction and the castle high on the right. The reference's very thick pigment
  remains the responsibility of the separate foreground geometry/materials.

### Continuous surrounding mountains

Four arcs centered at −88°, +88°, −156° and +156° have 88° angular width,
radii 224/228/234/238 m and respective normalized source-u crops
(.015,.365), (.345,.005), (.325,.025), (.045,.37). The lower 27% of the source
painting is cropped out. They therefore sample left-side mountain ridges only,
never the castle; alternate arcs reverse u. Their adjusted heights and slightly
different atmospheric mix reduce conspicuous repetition. At least 16° overlaps
the original north arc, and adjacent side/rear arcs overlap by 20° or more.
The main northern skyline, framing and texture are retained.

CPU validation used Three.js Raycaster against the actual generated meshes,
including the shader's side-feather alpha formula, at eye height 10.72 m.
From the entry (0,15) and all four (±58,±58) corners, 0.5° yaw samples across
360° produced zero horizon gaps, with minimum combined alpha 1.0 in all 3600
rays. This verifies geometric horizontal coverage; final in-game look-around
and the overlapping peaks' appearance are delegated to root's GPU capture.
All vertex values are finite, side/rear u never exceeds .37, lower v is .27,
and calling dispose twice leaves the scene empty. Total geometry is 10066
vertices / 10056 triangles across five meshes. Report:
`C:/Users/spkf8/Desktop/Project/.qa-pigment/canyon-vista-calibration/surround-cpu-audit.json`.
