# Thick oil material atlases

Generated with the built-in image_gen tool on 2026-09-09 JST: one grayscale relief study and one matched colorization edit. Both PNG source masters are retained in design/source-images/; only the runtime WebP textures are shipped. The images are artistic relief studies, not physically measured height fields. Both were inspected with view_image at original resolution for broad overlapping swipes, curved bristle furrows, mixed pigments and raised edges.

Runtime assets:

- impasto-relief.webp: lossless 1024-square RGB data atlas; R=raw luminance relief, G=broad relief, B=groove depth. Numeric derivation and lossless verification are reproducible with design/derive-paint-atlas.py.
- impasto-pigment.webp: matched 1254-square color painting, quality 94 WebP, decoded in sRGB. Its original PNG retains full detail.

paint-texture.js smooths the normalized relief in Float32 and uploads a mipmapped RGBA16F data texture. R=fine relief, G=broad continuous relief, B=groove depth, A=1. Keeping blurred slopes in half-float eliminates the dark dotted terraces produced by differentiating an 8-bit rounded height image. The shader uses broad/fine relief at 75/25, gently bent pressure folds, and muted cavity color. Mirrored wrapping avoids discontinuities at nonidentical generated borders.

The shader applies both matched atlases through object-fixed UV-free triplanar coordinates, with stable offsets for instances. Normals, roughness, wet clearcoat and the actual marbled pigment colors respond together; the painting colors are remapped toward each world's existing palette. Broad pressure ridges, meso knife marks and fine bristle grooves are spatially attached to geometry rather than the screen. Existing dense random CanvasTexture albedo maps are reduced to their mean palette colour to remove the former linen-like ground noise. Sky and portal paintings use basic materials and are not converted. Materials tagged pigmentSurface=liquid retain their independent flow shader. pigmentDistant=true uses .90 roughness, zero coat and minimal .003 relief to preserve atmospheric perspective.

The material shader itself does not change silhouettes; separate scenery geometry supplies lifted paint lips, layers and drips. Generated height is an interpretation of relief from luminance, not calibrated physical measurement.

## Wet glaze calibration

Three glaze settings were compared using the actual world-0 geometry, CPU relief, current directional lights, shadows, ambient occlusion, and two low near-camera viewpoints. The selected B setting uses rock/path roughness .40, clearcoat .62 and clearcoatRoughness .16. It adds continuous warm glints on raised shoulders while retaining pigment. C (.32/.82/.10) introduced smaller metallic-looking bright spots and was rejected. Foliage, distant mountains and all other materials retain their separate prior settings. The temporary fixture and six comparison screenshots are in the workspace .qa-pigment/material-calibration directory, outside the shipped app. This improves wet surfaces but is not a claim that the complete game matches the reference image's quality.

## Surface-specific pigment calibration

The final profiles separate relief from pigment colour. Atlas chroma is limited to 2.5% on foliage, 4% on bark, 3.5% on architecture and 1.8% on gold, while rock/path retain 43%/37% mixed pigment. This avoids coating every object in the same blue/ochre veins. Foliage preserves its hue with broad object-fixed tonal swipes from .65 to 1.15. Four same-camera comparisons selected foliage relief depth .015: .005 remained flat on large petals, while .025 produced distracting fine glints. The rock/path wet glaze settings above remain unchanged.

## Grayscale relief generation prompt

Use case: stylized-concept.
Asset type: grayscale seamless height / displacement texture atlas for thick wet impasto oil paint in a real-time 3D game.
Create a square 1024 by 1024 flat topographic height texture. The subject is nothing but a continuous carpet of thick overlapping oil paint swipes with rounded raised wet ridges, palette knife lips, pushed-up curling edges, and dozens of fine long brush-bristle furrows within each larger swipe. Broad individual swipes fill about one sixth to one third of the width and run mainly vertically with graceful gentle bends, pushed and folded into each other. Uneven natural tapered ends and a sense of heavy viscous pigment. Contrast in grayscale describes physical height: near white highest rounded ridges, medium gray paint body, dark charcoal very narrow deep grooves and crevices. It should resemble a top-down embossed gray sculptural surface or a height scan of exquisitely sculpted thick paint, not colorful art. Seamless / tileable top and bottom and left and right, matching edges, full coverage. No ground, no background gaps, no depicted objects, no shading from a directional light, no specular bright points, no ambient gradient, no perspective, no text, no watermark, no frame. The relief shapes should have broad smooth mounds and sharp fine internal bristle grooves together. Crisp intricate tactile viscous impasto, not cracked mud, not woven cloth, not rock, not pebbles, not noise.

## Matched pigment colorization prompt

Use case: style-transfer.
Asset type: color pigment texture atlas for a real-time oil-painted 3D world.
Edit the supplied grayscale impasto texture. Preserve the exact full-bleed square composition, every broad swipe shape, flowing direction, bristle furrow, lifted edge and sculptural relief. Change the gray pigment into rich artist oil colors: deep ultramarine and cobalt blue, dark petrol teal, warm golden ochre, creamy ivory, with restrained streaks of burnt sienna. Colors vary meaningfully within each individual thick swipe as it picks up underlying pigments: long marbled strands of warm and cool paint in the same stroke, exposed dark-blue underpainting at some lifted edges, ivory pigment mixed onto raised golden crests. It is thick, freshly wet, viscous oil paint, not metal or rock. Broad coherent smooth wet brush surfaces, occasional crisp long fine bristle grooves and luminous ridges. Do not add micro speckles, dots, grain, glitter, canvas weave or noise. Retain the original vertical flowing pattern, identical geometry and perspective, consistent relief. Colorize the supplied texture only. No new objects, no text, no signature, no watermark, no border.

