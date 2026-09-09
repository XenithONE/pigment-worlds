from pathlib import Path
from PIL import Image, ImageFilter, ImageChops
import json

root = Path(__file__).resolve().parents[1]
source = root / "design/source-images/impasto-height-source.png"
out = root / "public/art/materials/impasto-relief.webp"
image = Image.open(source).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
# The source is grayscale. Interpret luminance as an artistic height field.
height = image.convert("L").point(lambda value: max(0, min(255, round((value / 255 - .08) / .82 * 255))))
broad = height.filter(ImageFilter.BoxBlur(5))
groove = ImageChops.subtract(broad, height).point(lambda value: min(255, round(value * 4.5)))
packed = Image.merge("RGB", (height, broad, groove))
packed.save(out, format="WEBP", lossless=True, method=6)
decoded = Image.open(out).convert("RGB")
assert decoded.tobytes() == packed.tobytes(), "The relief channels must survive compression exactly."
print(json.dumps({"path": str(out), "bytes": out.stat().st_size, "size": decoded.size, "channels": "R=raw relief; G=broad relief; B=groove depth", "lossless_verified": True}))
