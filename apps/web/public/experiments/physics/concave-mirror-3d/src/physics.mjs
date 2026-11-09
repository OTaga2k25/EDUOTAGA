// Concave mirror, u-v method. DOM-free so it can be tested in node.
export const LENS_X = 100;         // cm, mirror position on the 120 cm bench (the mirror faces the 0 end)
export const BENCH = 120;          // cm
export const U_MIN = 5, U_MAX = 90; // object distance from the mirror
export const V_MAX = 90;           // screen distance from the mirror (cannot go beyond x = 10)
export const OBJ_H = 4;            // cm, height of the object arrow
export const SHARP_W = 0.8;        // cm, half-width of the sharpness peak
export const SHARP_OK = 0.8;       // sharpness needed to accept a reading (|dv| < 0.4 cm)

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A mirror: hidden focal length 10.0 - 20.0 cm
export function newLens(seed) {
  const r = mulberry32(seed);
  return { seed, f: Math.round((10 + r() * 10) * 10) / 10 };
}

// Exact image distance from the mirror formula 1/v + 1/u = 1/f (Cartesian: u, v, f all negative), in magnitudes:
// 1/v = 1/f - 1/u  (real image when u > f)
export function imageDistance(f, u) { return u > f ? (u * f) / (u - f) : null; }

// Small repeatable error in judging best focus: +/-0.3 cm, fixed per lens and per u
export function focusOffset(lens, u) {
  const s = Math.sin(u * 12.9898 + lens.seed * 78.233) * 43758.5453;
  return ((s - Math.floor(s)) - 0.5) * 0.6;
}
// Screen position where the image looks sharpest (cm from the lens), or null if there is no image on the bench
export function bestScreen(lens, u) {
  const v = imageDistance(lens.f, u);
  if (v === null) return null;
  const b = v + focusOffset(lens, u);
  return b <= V_MAX ? b : null;
}
export function sharpness(lens, u, vs) {
  const b = bestScreen(lens, u);
  if (b === null) return 0;
  const d = (vs - b) / SHARP_W;
  return 1 / (1 + d * d);
}
export const magnification = (u, v) => v / u;
export const focalLength = (u, v) => (u * v) / (u + v);

// Least-squares line y = a + b x
export function linearFit(pts) {
  const n = pts.length; if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  pts.forEach((p) => { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
  const den = n * sxx - sx * sx; if (Math.abs(den) < 1e-12) return null;
  const b = (n * sxy - sx * sy) / den, a = (sy - b * sx) / n;
  return { a, b };
}
