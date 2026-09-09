# Aligned pigment and canyon materials — v14

The previous scene combined pale material values with colour and relief that did not share the same texture orientation. The correction keeps the existing original paint atlas and makes its colour, geometric relief and fine shading follow the same surface coordinates.

## Implemented change

- The pigment texture now uses `flipY = false`, matching the top-row-first canvas pixels used by the relief DataTexture. A CPU comparison of source-image gradients measured correlation 0.7103 in the native orientation versus 0.0014 with one image vertically flipped. This diagnoses orientation alignment; it does not prove physically measured paint height.
- Displaced geometry retains its original position and normal as `oilRestPosition` and `oilRestNormal`. Colour projection and triplanar weights use those coordinates, preventing displacement from shifting the sampled brush boundaries. Anchored and ordinary geometry have separate material and shader-cache variants. The CPU relief sampler now uses the same texel centres as GL linear sampling.
- All four worlds use stronger direct atlas colour profiles for ground, paths, rocks and canyon surfaces. These preserve more of the source cobalt, ochre and ivory instead of multiplying everything into pale base colours. Lighting, roughness and clearcoat still respond to view and surface shape.
- Continuous canyon faces receive deeper geometric relief. The displacement fades smoothly at their upper and lower joins so the banks remain attached to the surrounding terrain.
- The canyon adds 132 cypress/shrub instances in terrace groves, with 56 nearby collision proxies. Placement excludes the main route, spawn and discovery/portal clearings; distance and quality settings select geometric detail. Canyon grass is shorter, thinner and less dense, and fallen fragments were removed. The hero tree uses a lighter crown palette.
- The canyon now uses the original thick-impasto panorama revision and its revised skyline contour. The filename retains `candidate` for source traceability; this pair is the adopted runtime asset. [Image generation record](canyon-impasto-candidate-prompts.md).

## Rejected experiment and remaining limits

A separate procedural atlas built continuous height and colour from 88 overlapping spline strokes. Height was independent of pigment brightness; a 7× relief fixture produced continuous paint ridges. Normal-depth objects still looked glazed and smooth, and even a stronger cobalt/cream version lacked the source artwork's irregular piled edges and fine brush structure. It was not adopted. The factory and evidence were archived outside the application in the local material lab, and no runtime reference remains. Earlier isolated 3D stroke-flake and stronger painterly-filter experiments were also excluded.

The adopted height atlas remains an artistic image-derived relief field. Repeating patterns, smooth large cliff forms and the modeled tree are still visible. The entrance composition partly hides the river behind the central tree and flower beds. The new panorama is a fixed image, not traversable architecture. Richer surface colour and correct alignment address concrete defects without establishing full fidelity to the supplied reference.

[Verification and browser evidence](../docs/verification.md).
