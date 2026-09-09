"""Convert the generated mask to numerical mesh coordinates, not a bitmap edit.

Requires Pillow. Run from any directory. Each source column contributes the
first white pixel; everything below that outer skyline is solid scenic mesh.
This deliberately ignores the mask generator's erroneous internal dark holes.
"""
import json
from pathlib import Path
from PIL import Image

project = Path(__file__).resolve().parent.parent
mask = Image.open(project / "design/source-images/canyon-vista-mask-source.png").convert("L")
source = Image.open(project / "design/source-images/canyon-vista-source.png").convert("RGB")
width, height = mask.size
outline = []
for x in range(width):
    first = next((y for y in range(height) if mask.getpixel((x, y)) > 192), height - 1)
    # The generated mask shifted the narrow central castle roofs several pixels.
    # Their dark outlines are unambiguous against the pale original sky. Trace
    # that local geometric boundary from source samples, preserving the image.
    if 1515 <= x <= 1624:
        edge = next((y for y in range(210) if max(source.getpixel((x, y))) < 155), None)
        if edge is not None:
            first = max(0, edge - 1)
    outline.append(round(1 - first / (height - 1), 6))
destination = project / "public/art/vistas/canyon-ridgeline.json"
destination.write_text(json.dumps({"width": width, "height": height, "outline": outline}, separators=(",", ":")), encoding="utf-8")
print(destination)
