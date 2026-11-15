// Convex lens, displacement method. DOM-free so it can be tested in node.
// The object is fixed at OBJ_X; the screen is at distance D from it and the lens at distance p from the object.
export const LENS_X = 40;          // cm, lens position on the 120 cm bench
export const BENCH = 120;          // cm
export const U_MIN = 5, U_MAX = 40; // object distance range (object slides from x = 35 to x = 0)
export const V_MAX = 110;           // image distances beyond this are off the bench
export const OBJ_X = 8, D_MIN = 20, D_MAX = 110;
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

// A lens: hidden focal length 10.0 - 20.0 cm
export function newLens(seed) {
  const r = mulberry32(seed);
  return { seed, f: Math.round((10 + r() * 10) * 10) / 10 };
}

// Exact image distance from 1/v - 1/u = 1/f with the Cartesian sign convention (u positive here):
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

// The two lens positions (distance from the object) that give a sharp image on a screen D away, or [] if D < 4f
export function conjugates(f, D) {
  const disc = D * D - 4 * D * f; if (disc < 0) return [];
  const r = Math.sqrt(disc); return [(D - r) / 2, (D + r) / 2];
}
export const fDisplacement = (D, d) => (D * D - d * d) / (4 * D);

// Sharpness against the lens position p (depth of focus for moving the lens, about +/-0.25 cm),
// with a small repeatable error in judging the best position. Returns 0..1, and the defocus in cm.
export const P_W = 0.3;
export function lensDefocus(lens, D, p) {
  const c = conjugates(lens.f, D); if (!c.length) return null;
  const pc = c.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
  return p - (pc + focusOffset(lens, pc) * 0.5);
}
export function lensSharpness(lens, D, p) { const d = lensDefocus(lens, D, p); if (d === null) return 0; const x = d / P_W; return 1 / (1 + x * x); }
