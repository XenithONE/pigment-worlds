import { DataTexture, DataUtils, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, MirroredRepeatWrapping, NoColorSpace, RGBAFormat, SRGBColorSpace, TextureLoader, UnsignedByteType } from 'three';

// RGB encode relief, broad relief, and grooves. Half floats keep the smooth
// height slopes continuous: rounding blurred height back to 8 bits makes visible
// terraces when that height is differentiated into physical surface normals.
const neutral = new Uint16Array([DataUtils.toHalfFloat(.5), DataUtils.toHalfFloat(.5), 0, DataUtils.toHalfFloat(1)]);
const texture = new DataTexture(neutral, 1, 1, RGBAFormat, HalfFloatType);
texture.name = 'PIGMENT / continuous multiscale oil relief';
texture.colorSpace = NoColorSpace;
texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
texture.magFilter = LinearFilter;
texture.minFilter = LinearMipmapLinearFilter;
texture.generateMipmaps = true;
texture.needsUpdate = true;
export const oilPaintUniform = { value: texture };
export const oilPaintReadyUniform = { value: 0 };
const neutralPigment = new DataTexture(new Uint8Array([180, 180, 180, 255]), 1, 1, RGBAFormat, UnsignedByteType);
neutralPigment.needsUpdate = true;
export const oilPigmentUniform = { value: neutralPigment };
let loading;

// Two sliding-window passes operate in Float32 throughout, including boundaries.
function blurHeight(input, size, radius) {
  const tmp = new Float32Array(input.length), output = new Float32Array(input.length);
  const width = radius * 2 + 1, clamp = v => Math.max(0, Math.min(size - 1, v));
  for (let y = 0; y < size; y++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += input[y * size + clamp(k)];
    for (let x = 0; x < size; x++) {
      tmp[y * size + x] = sum / width;
      sum += input[y * size + clamp(x + radius + 1)] - input[y * size + clamp(x - radius)];
    }
  }
  for (let x = 0; x < size; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += tmp[clamp(k) * size + x];
    for (let y = 0; y < size; y++) {
      output[y * size + x] = sum / width;
      sum += tmp[clamp(y + radius + 1) * size + x] - tmp[clamp(y - radius) * size + x];
    }
  }
  return output;
}

export function loadOilPaintTexture() {
  if (loading) return loading;
  const reliefLoading = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const size = 1024, canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        const height = new Float32Array(size * size);
        // R is the normalized luminance-height channel of our lossless atlas.
        for (let i = 0; i < height.length; i++) height[i] = pixels[i * 4] / 255;
        const fine = blurHeight(height, size, 2);
        const broad = blurHeight(blurHeight(height, size, 6), size, 3);
        const data = new Uint16Array(size * size * 4);
        for (let i = 0; i < height.length; i++) {
          data[i * 4] = DataUtils.toHalfFloat(fine[i]);
          data[i * 4 + 1] = DataUtils.toHalfFloat(broad[i]);
          data[i * 4 + 2] = DataUtils.toHalfFloat(Math.max(0, Math.min(1, (broad[i] - fine[i]) * 3)));
          data[i * 4 + 3] = DataUtils.toHalfFloat(1);
        }
        texture.image = { data, width: size, height: size };
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        resolve(texture);
      } catch (error) { reject(error); }
    };
    image.onerror = () => reject(new Error('The impasto relief atlas could not be loaded.'));
    image.src = `${import.meta.env.BASE_URL}art/materials/impasto-relief.webp`;
  });
  const pigmentLoading = new TextureLoader().loadAsync(`${import.meta.env.BASE_URL}art/materials/impasto-pigment.webp`).then(pigment => {
    pigment.name = 'PIGMENT / marbled artist pigments';
    pigment.colorSpace = SRGBColorSpace;
    // Canvas pixels and DataTexture both keep the source's top row first.
    // TextureLoader otherwise flips only albedo, separating its brush edges
    // from the CPU/GPU relief field even though the source images align.
    pigment.flipY = false;
    pigment.wrapS = pigment.wrapT = MirroredRepeatWrapping;
    pigment.anisotropy = 4;
    pigment.needsUpdate = true;
    oilPigmentUniform.value = pigment;
    neutralPigment.dispose();
    return pigment;
  });
  loading = Promise.all([reliefLoading, pigmentLoading]).then(() => { oilPaintReadyUniform.value = 1; return texture; });
  return loading;
}

