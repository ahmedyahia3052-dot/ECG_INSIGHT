import sharp from "sharp";

let cachedSyntheticEcgPng: Buffer | undefined;

export async function createSyntheticEcgPngBuffer() {
  if (cachedSyntheticEcgPng) return cachedSyntheticEcgPng;

  const width = 800;
  const height = 600;
  const pixels = Buffer.alloc(width * height * 3, 255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const grid = x % 10 === 0 || y % 10 === 0 ? 220 : 255;
      const trace = y > 120 && y < 140 && Math.sin(x / 18) > 0.4 ? 40 : grid;
      pixels[index] = trace;
      pixels[index + 1] = trace;
      pixels[index + 2] = trace;
    }
  }

  cachedSyntheticEcgPng = await sharp(pixels, { raw: { channels: 3, height, width } }).png().toBuffer();
  return cachedSyntheticEcgPng;
}
