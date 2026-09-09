# Original distant scenic paintings

Generated with the built-in imagegen tool on 2026-09-10. These assets are static,
decorative distant paintings. They do not represent traversable 3D buildings.
The browser renderer mounts them on fixed curved surfaces and separate shallow
curved fragments; nearby terrain, buildings and plants remain real 3D.

## Panorama

- Editable source: `source-images/starry-vista-source.png` (2172 × 724 RGB)
- Runtime: `../public/art/vistas/starry-vista.webp` (quality 95 WebP)
- Generated output: `exec-f101180d-b4f7-4b10-97ce-ab6ba9fa5158.png`

Prompt:

> Use case: stylized-concept. Asset type: production distant landscape panorama for a browser game, original museum-quality oil painting. Very wide panoramic 3:1 composition, highest possible resolution, full bleed, no frame, no writing. An exquisitely detailed original nocturnal landscape inspired by Van Gogh's deep ultramarine and luminous yellow palette: an entire small medieval riverside village and tall slender church spire nested among layered jagged cobalt mountains, countless carefully painted small golden lit windows, ochre roofs, blue stone terraces, cypresses, a long graceful stone arch bridge crossing a lake, tiny reflected gold lights and violet-blue wooded hills. Landscape fills 80 percent of the image, sky only top 20 percent. Broad view from afar, no foreground close objects, no people. Village mostly center-left, water and bridge center-right, irregular varied mountains spanning the entire horizon. Refined legible small brush shapes, many individually articulated roofs, windows, stone arches and tree crowns, dense rich detail at every scale. Visibly original hand-painted oils with layered knife edge highlights, deliberate fine curved brushwork; moderately thick oil paint but the town's small architectural forms remain clear. Deep dark blue and turquoise shadows, gold and lemon light, touches of violet and muted ochre. The sky is a quiet dark midnight cobalt band with tiny small stars and fine directional brushstrokes: NO giant swirls, NO giant moon, NO enormous star rings. Bottom 12 percent is dark ultramarine softly painted hills and shoreline with sparse detail, naturally blending into a dark blue game landscape. Left and right edges predominantly layered blue hills. The image is a painted scenic backdrop, not a screenshot or game UI. Avoid photorealism, plastic 3D rendering, blurry details, huge brush loops, giant foreground plants, signage, lettering, watermark.

## Transparent scenic fragments

- Editable source: `source-images/starry-vista-layers-source.png` (2172 × 724 RGBA)
- Runtime: `../public/art/vistas/starry-vista-layers.webp` (quality 95 RGBA WebP)
- Generated output: `exec-93c07c9d-1a86-4589-b114-a179acaea2df.png`
- Original alpha channel inspected: 0–255. No background-removal processing.

Prompt:

> Use case: stylized-concept. Asset type: one production RGBA sprite atlas for distant scenic layers in a fine oil-painted night landscape. TRUE TRANSPARENT BACKGROUND, preserve real alpha, no paper/background/sky, no checkerboard drawn. Very wide 3:1 canvas split into THREE equally wide vertical cells, each contains one distinct isolated complete landscape fragment with generous transparent margins, no objects crossing cell boundaries. Left cell: an irregular low blue crag with six slender dark blue cypresses of varied height and a tiny ochre-roofed stone cottage with warm golden lit windows, lush brush-painted small shrubs around its base. Center cell: a long low curving blue-violet lakeside rock bank with a few small ochre houses and three cypresses, one short ancient stone arch crossing a narrow gap. Right cell: a rocky rising blue forest hillside with varied short cypresses and a tiny distant square watchtower with one lit window. All three are side-on landscape silhouettes as seen from 100 metres across a valley, not miniature products and no isometric view. Their bottom edges are ragged organic fine painted shrub foliage fading to transparent, while rocks, houses and trees remain fully opaque. Original museum-quality oil painting with precise small vigorous brush shapes, layered blue and indigo and teal pigment, warm ochre highlights, visible thick paint at highlighted edges, dense legible architectural and botanical detail. Van Gogh inspired deep ultramarine night palette. Keep shadows dark and rich, tiny windows lemon-gold. No white halos, no drop shadows, no text, no people, no frame, no labels, no giant swirl, no moon, no stars, no photographic scenery, no CGI plastic rendering. Three separate landscape fragments, each confined to its own third of the canvas; generous clear transparent space above their irregular silhouettes.

## Renderer contract

`await loadPaintedVistas()` loads the three shared image textures once. Calling
`addPaintedVistas(scene, { id, origin: [0, 5, 0] })` returns `{ group, dispose }`.
Worlds 0 and 1 are enabled. IDs 2 and 3 return a no-op handle. `dispose()` removes
and releases the world's geometry and materials while retaining cached images.
No frame update or camera-facing billboarding occurs. Material alpha fades when
a player approaches within 60–76 metres, so scenic planes are never near props.
The main panorama uses a sampled scenic mesh silhouette along the mountain
summits, side feathering, and a low bottom fade. The generated RGBA scenic
fragments preserve their actual silhouette alpha. Extra fragments continue the
horizon around the sides/rear. Default worldScale 1.75 keeps them beyond the
near-fade distance throughout the playable +/-58 m square.

The caller may hide the old `mountain-range-*` objects for worlds 0 and 1. This helper
does not hide, reposition or dispose any other scene content.

## Garden vista and edge correction

- Original generated RGBA reference: `source-images/garden-vista-source.png`
  (2171 × 724). Rejected for runtime: neon green/yellow fringe in edge pixels.
- Accepted opaque painting: `source-images/garden-vista-opaque-source.png`
  (2173 × 724 RGB), `../public/art/vistas/garden-vista-opaque.webp` (quality 95).
- Actual generated output: `exec-ee1d5e97-10d0-4634-88a4-9008bc916649.png`.
- Geometry follows the opaque image's crown silhouette. The image is not
  modified by background-removal scripts. Black and gray scene-background
  screenshots were inspected in `.qa-pigment/garden-vista-calibration`.

Original generation prompt:

> Use case: stylized-concept. Asset type: one very wide 3:1 production RGBA painted scenic sprite, an original richly detailed Monet-inspired distant garden vista, with a TRUE TRANSPARENT BACKGROUND above the irregular treetop silhouette. This is an isolated landscape cutout asset, not a rectangular painting on paper. The cutout contains a broad luminous garden landscape viewed from across a long pond: dense overlapping weeping willows, flowering apple and cherry trees, tall poplars, a little distant pale-green arched footbridge, thick beds of tiny pink/white/blue/lilac flowers, rose hedges, irises, and patches of distant still water with delicate broken reflections and water lilies. The TREES form an uneven gently varied silhouette against fully transparent empty background. Do not draw any sky, clouds, moon, stars, or background color above the trees. All garden foliage, flowers, soil banks and water below the treetops remain opaque. No foreground close tree or giant blossoms, all scene features are consistent distant scale; meticulously legible fine flowers and tree shapes. Painterly museum-quality ORIGINAL oil painting, fine varied broken brush marks and small wet knife highlights, visibly layered pigment, precise natural forms but never photographic or 3D CGI. Deep sap green and emerald shadow pockets, celadon/mint/spring green foliage, pale pink and white flowering trees, violet/lilac/cream flower highlights, turquoise silver water, a warm gentle morning glow. Not pastel wash: preserve rich contrasting green masses and lively small colour marks. Foliage fills the upper two thirds of the visible painted shape, narrow reflective pond and flower banks its bottom third; bottom edge is an irregular soft bank of olive green and small flowers. Very wide panoramic view, full scene spans entire width, no isolated square panels, no frame, no writing, no people, no labels, no checkerboard drawn. Output a real transparent-background RGBA image, with no white matte and no white outline around the treetops.

Accepted edit prompt (reference: original RGBA garden):

> Use case: precise-object-edit. Edit the supplied Monet garden panorama. Preserve the exact overall garden composition, trees, willow branches, flowers, bridge, pond, and fine oil-painting detail. IMPORTANT CORRECTION: remove every neon green, lime yellow, white, or checker-like fringe along the outside treetop edges. Replace those contaminated edge pixels with NATURAL DARK SAP GREEN foliage and natural olive midtone leaf brush marks matching the interior of the trees, with no colored outline. Replace the transparent area above the treetops with an OPAQUE smooth muted gray-sage atmosphere, approximately #8d9c93, softly painted and extremely low contrast. This output must be a fully opaque RGB painting; no transparency and no checkerboard. The outside treetop silhouette should be precise, organic, softly antialiased into the quiet gray-sage atmosphere without any white or fluorescent rim. Do not add new large trees or architecture or new flowers; retain the original very wide 3:1 landscape and the exact scale of distant elements. No text, no frame. Fine museum-quality original oil brushwork, deep green shadow masses, subtle silvery morning light. Change only the background and contaminated neon edge colors, keep the rest of the painting as close as possible to the reference.

## Fine night sky candidate

- Source: `source-images/starry-sky-fine-source.png` (1774 × 887 RGB).
- Generated output: `exec-26f83956-58fd-4792-a214-67ade7e17e9c.png`.
- Submitted as `../public/art/starry-sky-fine-candidate.webp`; root reviewed and
  adopted this separately as the active `starry-sky.webp`. The duplicate
  candidate is now in workspace `.qa-pigment/rejected-vista-assets/`.

Prompt:

> Use case: stylized-concept. Asset type: production 360-degree equirectangular oil-painted SKY panorama for a browser 3D game. Very wide 2:1 equirectangular composition, highest resolution, full bleed no frame no text. An original exquisite midnight sky inspired by Van Gogh's nocturne palette, to harmonize with a finely painted ultramarine medieval village. The sky is deep DARK COBALT and ULTRAMARINE with very fine visible oil brushwork. Thousands of small varied brush strokes make gently sweeping long subtle winds of blue, teal and muted indigo across the sky. Stars are SPARSE TINY luminous lemon-gold points with only small restrained ring-like strokes, varied size, almost all smaller than 0.4 percent of image height. A modest small gold crescent moon about 2 percent of image height in the upper-right third, no large halo. At most two subtle far-away broad currents, not circular swirls, very low contrast dark blue on blue. The overall sky remains dark and quiet enough that an illuminated village below would be visually dominant. A thin low atmospheric blue haze lies along the bottom 8 percent. Bottom edge almost entirely dark ultramarine mist, no discernible foreground, no buildings, no plants, no mountains above bottom 3 percent. Fine crisp authentic oil brush marks at many scales, richly layered blue paint, minute gold star dabs; no gigantic star wheels, no giant white swirls, no blinding moon, no giant blue-white spiral occupying the sky. Equirectangular environment texture with coherent left-right join and quiet polar areas. Avoid photorealistic galaxy photographs, nebulae, CGI, smooth digital gradients, text, border, watermarks. Small-scale refined painterly sky detail, expansive atmospheric night.

## Transparency limitation recorded

Two built-in edit attempts to remove the night panorama's sky returned RGB
checkerboard pixels rather than actual alpha. These were rejected as runtime
assets. `starry-vista-cutout-source.png` was moved to workspace
`.qa-pigment/rejected-vista-assets/` as a tracing reference. The original detailed
night panorama is the runtime colour texture; its upper boundary is cut by mesh
geometry. The rejected fringe-contaminated `garden-vista.webp` is also archived
there; the renderer loads only `garden-vista-opaque.webp`.

## Final verification

- Runtime vista textures: `starry-vista.webp`, `starry-vista-layers.webp`, and
  `garden-vista-opaque.webp`; active sky texture: `starry-sky.webp`.
- Night fixed scene-camera comparison: `.qa-pigment/vista-calibration/`.
- Garden entry, side view, and black/gray edge inspection:
  `.qa-pigment/garden-vista-calibration/`.
- Integrated night with the accepted fine sky:
  `.qa-pigment/vista-night-final/world-0.png`; browser errors empty.
- These captures establish rendered appearance and spatial scenery layering,
  not that the distant painted architecture is traversable 3D geometry.
