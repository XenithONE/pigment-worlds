# Pigment and canyon material revisions

## v17 — dragged paint on plants

The selected plant revision flattens the broad botanical blade faces and places more thickness at the folded perimeter. Stems are closed flattened ribbons, and vertex pigment bands follow their modeled ridges. A complete interior atlas region is sampled directly in blade UVs, so broad relief, pigment value and cavities belong to the same dragged field. Clearcoat is concentrated at a narrow lip. The first regular analytic-striped trial and a subtler spatially blended trial were rejected after nearby garden inspection.

Existing leaf and grass batches in all four worlds now use this blade material branch too. Coarse leaf geometries gain periodic folded UVs; their positions, normals and indices are unchanged. The [v17 plant verification](../docs/plant-verification-v17.md) separates its new checks and images from the historical v16 suite below. Some sculpted or clay-like appearance remains; this is not a claim of reference-level completion.

v16 builds on the retained pigment/relief atlas with thicker botanical forms,
paint-colour variation on deposited loads, shorter layered banks and poured
river steps. The canyon sky now carries broad painted clouds and a projected
overhead cap. Current checks and limits are recorded in
[verification](../docs/verification.md); publication is recorded separately.

## v16 — deposited colour and closer views

- Petal and leaf cross sections have more body, asymmetric folds and rolled edges. The blade's periodic UV coordinate carries broad longitudinal brush relief. Fine, densely sparkling blade shading was rejected in the first scene comparison.
- Crown and bank-deposit materials preserve their authored colours and vary pigment value along the matched broad brush field. A bounded gain prevents a white diffuse wash. Applying this transfer to all canyon surfaces erased their multicolour brush strands and was rejected; those surfaces retain the atlas blend, with darker authored pigments weighted more strongly.
- Canyon colour, shader relief and physical displacement share the smaller spatial scales 0.14 horizontally and 0.125 vertically. Shader depth is 0.12; the cliff displacement multiplier is 1.45, with the existing edge fade. These paired changes reduce stroke size while keeping approximate slope magnitudes near the preceding version.
- The upper near bank uses a single structured 164 × 1236 grid, with samples concentrated around close walking views. Coarse displaced triangles, rather than terrain overlap, caused the sharp foreground spikes found in the first close views. The local refinement retains the original sample positions and joins; the far bank keeps its earlier grid. This adds approximately 297,000 triangles to the canyon geometry.
- The river has three closed, rounded spill forms. Forty-three short, uneven bank deposits replace the first trial's long curtain-like loads. The spill forms sit 4 cm above the original river surface to avoid the intersections found in a local CPU inspection.
- The original v15 tree geometry is retained. Connected height-field crowns produced spikes and curtains; a subsequent union of 240 curved loads removed those artifacts but looked too much like rounded candy or cauliflower in the full scene. Those tree geometry trials were rejected. Stronger deposited-colour shading remains on the retained knife-edge crown.
- The new [sky image and exact prompt](sky-v16-prompts.md) are retained. A top projection blends into the panorama to remove the overhead pinhole seen in the initial spherical mapping. The distant castle/mountain painting is unchanged.

The changes are visual modelling and shading, not a simulation of wet paint.
Near-view geometry and browser evidence must be checked alongside the entry
composition; CPU topology alone does not establish reference-level appearance.

## v14 — adopted baseline

- `flipY = false` aligns the pigment image with the top-row-first relief DataTexture. Source-gradient correlation was 0.7103 in the native orientation versus 0.0014 with one image vertically flipped. This diagnoses orientation, not measured paint height.
- Displaced surfaces retain `oilRestPosition` and `oilRestNormal` for colour projection and triplanar weights. CPU relief sampling uses GL-compatible texel centres; anchored and ordinary geometry have separate shader variants.
- The thick-impasto canyon panorama and corrected skyline are adopted. Their `candidate` filenames retain source traceability. The [generation record](canyon-impasto-candidate-prompts.md) and [silhouette audit](canyon-impasto-silhouette-audit.md) distinguish the distant painting from traversable geometry.

Earlier full-scene and browser evidence is recorded in
[verification](../docs/verification.md), now updated with fresh v15 runs.

## v15 — adopted material and geometry

- The runtime retains `public/art/materials/impasto-pigment.webp` and `impasto-relief.webp`, the existing pair referred to as **classic** in the comparisons. The loader uses these assets directly; no development query selects an alternative atlas.
- Canyon faces use positive displacement `max(0, height - 0.18) * 2.0 * edgeFade`. The 2.0 m value is a scale factor, not a constant displacement at every point. Relief fades at the terrain joins. Canyon terrain uses `(height - 0.48) * 0.55`, and larger spatial brush forms use texture-coordinate scales of 0.095 horizontally and 0.085 vertically.
- Three overlapping texture patches blend on a triangular lattice. Colour, shading relief and CPU geometric displacement share the coordinate rules and undeformed surface positions. Small rotations stay within ±8 degrees, without mirrored or reversed strokes; interior sampling avoids the atlas's outer edges.
- The shader uses `textureGrad` with derivatives transformed by each patch's local Jacobian for both colour and relief. This corrects the mip and anisotropic footprints that implicit differentiation of discontinuous patch choices produced. The blended field is C0 continuous across triangle boundaries, not guaranteed C1: small slope or normal creases can remain.
- Closed 3D herbs replace mid-distance vegetation image cards in all four worlds. The hero crown has interlocking large and medium red, vermilion and gold deposits, folded loaded edges and connected drips. Deposited tree roots follow the canyon bank. The integrated river and these geometry changes remain alongside the selected material. Deliberately distant landscape panoramas remain painted scenery.

The classic relief loader reads the existing lossless atlas's normalized red
channel, smooths it at two scales in floating point and uploads half-float
channels. This avoids reintroducing the earlier 8-bit derivative terraces.
The field is an artistic relief guide, not a physical measurement of paint.

## Final comparison and rejected atlas trials

The `v15-loaded` and `v15-loaded-b` trials appeared too flat. Increasing actual
face displacement in `v15-depth` initially made the new atlas look promising,
but that comparison also changed the geometry. A subsequent paired comparison,
`v15-classic-depth` versus `v15-depth`, used the same stronger geometry.
Both the full-scene review and independent visual review judged classic more
viscous and recognizably oily; loaded still read more like coloured rock.
That controlled comparison reversed the provisional source choice. All loaded
atlas variants are rejected; the geometry and filtering improvements remain.

The rejected source was one original square image generated with built-in
`image_gen.imagegen`, informed by the old atlas and the supplied `image-1.png`
reference. Output `exec-d88a0f71-da0d-4492-ae74-2bfd82273ae6.png` was preserved
unchanged as `impasto-irregular-color-candidate.png` (1254 × 1254 RGB); its
comparison WebP used quality 95. The source, exact prompt and evidence remain
in the external QA archive under `material-v15/prompt-provenance.md`, outside
the application. No new source PNG or prompt document is added to the
application repository for this rejected experiment.

The loaded experiment derived a guide with
`clamp(0.20 + 0.72 * L + 0.45 * (L - localBlur(L)), 0, 1)`.
It retained broad pigment luminance while emphasizing a local residual; it
did not remove all broad value variation. This formula is historical and is
not the adopted loader. No independent matching height map was generated.
The source also retained crevice shading and did not have exactly matching
opposite edges, so it was neither measured albedo nor a certified seamless
material scan.

## Remaining limits

An earlier procedural atlas of 88 overlapping spline strokes and isolated
stroke-flake and stronger image-filter experiments were also excluded after
visual comparison. The adopted approach still has artistic, image-derived
relief and can show repeated marks or small mapping creases. Far castles and
mountains are fixed scenic paintings, not traversable architecture. The
selected improvements do not establish full fidelity to the supplied
reference. The completed v15 browser checks cover the tested views and machine,
not an assurance of identical appearance or performance on every device.
