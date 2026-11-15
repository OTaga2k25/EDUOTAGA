// Refractive index of a liquid using a convex lens and a plane mirror. DOM-free for Node tests.
// Lengths in cm. u is the height of the needle tip above the centre of the lens.
export const U_MIN = 3, U_MAX = 60;
export const TH = 0.8;              // lens thickness (centre)
export const TOL = 0.12;            // no-parallax tolerance: |image - needle| below this looks like no parallax
export const L_SPH = 5.0;           // spherometer: distance between the legs, cm
export const LIQUIDS = [
  { name: 'water', n: 1.333 }, { name: 'kerosene', n: 1.44 }, { name: 'coconut oil', n: 1.448 },
  { name: 'glycerine', n: 1.473 }, { name: 'turpentine oil', n: 1.47 }, { name: 'castor oil', n: 1.48 }];

export function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r1 = (v) => Math.round(v * 10) / 10, r3 = (v) => Math.round(v * 1000) / 1000;

// Hidden set-up: an equiconvex lens (focal length f1, glass index ng, both faces radius R) and a liquid
export function newSetup(seed) {
  const r = mulberry32(seed);
  const f1 = r1(15 + r() * 10), ng = Math.round((1.5 + r() * 0.03) * 1000) / 1000;
  const R = 2 * (ng - 1) * f1;                       // lens maker's formula for an equiconvex lens
  const liq = LIQUIDS[Math.floor(r() * LIQUIDS.length)];
  return { seed, f1, ng, R, liq };
}
// Focal length of the plano-concave liquid lens (negative) and of the combination
export const liquidF = (s) => -s.R / (s.liq.n - 1);
export const combinedF = (s) => 1 / (1 / s.f1 + 1 / liquidF(s));
export const lensF = (s, wet) => (wet ? combinedF(s) : s.f1);

// Lens + plane mirror behaves like a concave mirror of focal length F/2. Image height v for a needle at u.
// Returns null when the image is virtual (needle closer than F/2).
export function imageHeight(F, u) { const fm = F / 2; return u > fm + 1e-9 ? (u * fm) / (u - fm) : null; }
export const atNoParallax = (F, u) => { const v = imageHeight(F, u); return v !== null && Math.abs(v - u) <= TOL; };
// Apparent sideways shift of the image tip relative to the needle tip when the eye moves by e (-1..1). Units: arbitrary px.
// The eye is above. Of two objects, the one farther from the eye moves with the eye. If v > u the image is nearer
// the eye than the needle, so it moves against the eye (negative shift for positive e).
export function parallaxShift(F, u, e) {
  const v = imageHeight(F, u); if (v === null) return null;
  return Math.max(-70, Math.min(70, -140 * e * (v - u) / u));
}
// Scale readings: distance from the needle tip to the top of the lens (x1) and to the mirror (x2), to 0.1 cm
export function scaleReadings(u) { return { x1: r1(u - TH / 2), x2: r1(u + TH / 2) }; }

// Spherometer: height h of the central screw for a surface of radius R (legs L_SPH apart), read to 0.001 cm
export function spherometerH(R) { const a2 = (L_SPH * L_SPH) / 3; return r3(R - Math.sqrt(R * R - a2)); }
export const radiusFrom = (l, h) => (l * l) / (6 * h) + h / 2;
// Results
export const fLiquidFrom = (f1, F) => (f1 * F) / (F - f1);              // magnitude of the liquid lens focal length
export const indexFrom = (R, fl) => 1 + R / fl;
