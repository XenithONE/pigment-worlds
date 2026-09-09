# Golden impasto sky — v16 selected asset

Created on 2026-09-10 JST with the built-in `image_gen.imagegen` tool in edit/style-transfer mode. This original generated sky was selected for the v16 canyon after scene inspection. It is not a reconstruction of the supplied reference landscape. No CLI/API fallback was used.

## Inputs and saved outputs

1. Edit target: [existing golden sky](../public/art/golden-sky.webp), 1774 × 887.
2. Style guidance only: the user-supplied `image-1.png`. Its thick painted clouds and brushed blue sky informed the medium; its landscape, tree, castle and lettering were excluded.

The built-in output was `exec-9da69c10-9f55-4d4b-87ed-9e55e05e4604.png`.

- [Unchanged source PNG](source-images/golden-impasto-sky-v16.png): 1774 × 887 RGB, exactly 2:1, 2,669,524 bytes. Its bytes match the generated output.
- [Selected WebP](../public/art/golden-impasto-sky-v16.webp): 1774 × 887, 571,584 bytes, Pillow WebP quality 95 / method 6. Conversion retains the full dimensions; no resizing, cropping or content edits were applied.
- Source SHA-256: `5d09697a0996e2630c8260e4420b31eb6da711b4c4c87661aa97ffaa6a0cfa7c`.
- WebP SHA-256: `bdf65f56b8c84e4669984a0210dfcf00b5146106cd24f9df51d8d9b5cbf8dfa0`.

## Inspection and limits

The generated flat image was visually inspected. Broad cream/rose/lavender cloud masses and the blue gaps now carry overlapping impasto strokes and raised-looking knife edges. No landscape, buildings, vegetation or text is visible. The output retains the edit target's resolution rather than the preferred 2048 × 1024 requested in the prompt.

At the asset-generation stage, the existing `golden-sky.webp` and runtime loader were left unchanged. A 2:1 ratio and a wrap request do not establish a mathematically correct or seamless equirectangular projection. The source's opposite one-pixel edge columns have a mean absolute RGB difference of 9.90 / 255, so the boundary pixels are not identical. That measurement alone does not predict the seam's visibility. No local GPU render was performed during asset generation.

### Scene trials and selection

The `v16-sky-preview` trial integrated the candidate into the canyon. Its entrance, west, south and east screenshots show stronger impasto clouds without an obvious vertical sky seam in those inspected directions. The browser evidence records no page/console errors. This is a sampled-view observation, not seamlessness certification. The zenith screenshot exposes severe pinhole convergence of the strokes at the equirectangular pole.

A subsequent sky-shader change blends a planar projection of a brushed-blue texture patch over the zenith, with a smooth transition from normalized sky-direction Y = 0.82 to 0.97. The corrected `canyon-explore-v16/zenith.png` was inspected: the former pinhole convergence is absent, and broad brushed sky remains visible. The entrance, west, south and east views also show no obvious hard vertical sky seam in the sampled directions. This supported selecting the asset for world 2; the runtime loader now uses `golden-impasto-sky-v16.webp` there.

The generated PNG and WebP remain unchanged. The overhead image is a blended projection rather than an unmodified spherical panorama. These inspected views do not certify seamlessness over every direction, device or transition, and the original opposite-edge pixels still differ as recorded above. This records asset selection and local visual evidence, not publication status or equivalence to the reference's overall visual quality.

## Exact generation prompt

```text
Use case: style-transfer.
Asset type: one 2:1 equirectangular sky-only panorama candidate for a walkable oil-painting world.
Input image 1 is the EDIT TARGET: the current blue, cream and pale rose all-around sky panorama. Input image 2 is STYLE GUIDANCE ONLY: use the visibly thick oil paint of its CLOUDS and blue sky gaps. Do not copy any landscape, tree, castle, lettering or other object from image 2.
Primary request: repaint the entire sky of image 1 in the tactile impasto medium of image 2. Preserve the target's broad blue/cream/rose colour balance, open sky between cloud groups, calm horizon atmosphere, panoramic proportions and all-around sky-only function. Replace its thin photographic cloud wisps with a few broad, substantial, creamy cloud masses made from many visibly overlapping loads of oil paint.
Materials: layered ivory, warm cream, blush rose and muted lavender cloud deposits, flattened palette-knife bodies, irregular torn and rolled loaded edges, smaller coherent bristle tracks within each broad stroke, subtle shaded paint crevices. The blue gaps are visibly brushed pigment too, with broad directional strokes. Richly painted sky, not photographic clouds with a texture filter. The cloud forms should remain airy and spacious at scene scale while their material clearly looks like thick hand-deposited paint.
Composition: exactly 2:1 panoramic frame, preferably 2048 by 1024 or higher at the same ratio. Sky continues around all 360 degrees; left and right edges should have compatible colour, cloud placement and brush flow for horizontal wrapping. Keep the horizon belt calm and low contrast and avoid any hard horizon line. Do not create a dominant circular cloud vortex or a central framed composition. Use blue openings across the whole panorama, with broad cloud shapes of unequal size instead of uniformly scattered little clouds.
Lighting: soft warm directional illumination, retained colour in ivory highlights, no large blown-out white patch, no bright glowing sun disk, no isolated light blob, no photographic bloom or lens effects.
Strict exclusions: no ground, sea, mountains, buildings, castle, tree, vegetation, figures, animals, objects, lettering, text, signature, watermark, border or frame. Opaque full-frame sky. This is an original painted sky asset, not a recreation of the reference landscape.
```
