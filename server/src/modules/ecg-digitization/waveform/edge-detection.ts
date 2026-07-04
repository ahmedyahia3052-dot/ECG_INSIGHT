export function sobelGradient(data: Uint8Array, width: number, height: number): Float32Array {
  const output = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = (row: number, col: number) => data[row * width + col] ?? 128;
      const gx =
        -idx(y - 1, x - 1) + idx(y - 1, x + 1)
        - 2 * idx(y, x - 1) + 2 * idx(y, x + 1)
        - idx(y + 1, x - 1) + idx(y + 1, x + 1);
      const gy =
        -idx(y - 1, x - 1) - 2 * idx(y - 1, x) - idx(y - 1, x + 1)
        + idx(y + 1, x - 1) + 2 * idx(y + 1, x) + idx(y + 1, x + 1);
      output[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return output;
}

export function thresholdEdges(gradient: Float32Array, threshold: number): Uint8Array {
  const output = new Uint8Array(gradient.length);
  for (let index = 0; index < gradient.length; index += 1) {
    output[index] = gradient[index] >= threshold ? 255 : 0;
  }
  return output;
}
