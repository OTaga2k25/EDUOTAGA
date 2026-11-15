// Tangent galvanometer: reduction factor and the horizontal component of the Earth's field. DOM-free for Node tests.
export const MU0 = 4 * Math.PI * 1e-7;
export const TURNS = [2, 5, 50];
export const I_MAX = 1.0, ALPHA_MAX = 30, LC_I = 0.01, LC_TH = 0.5;
export function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const RAD = Math.PI / 180, DEG = 180 / Math.PI;
// Hidden: Earth's horizontal field BH (T), coil radius r (m), starting misalignment of the coil, pointer eccentricity
export function newSetup(seed) {
  const r = mulberry32(seed);
  return { seed, BH: Math.round((3.2 + r() * 0.8) * 1e-5 * 1e8) / 1e8, r: Math.round((0.075 + r() * 0.03) * 1000) / 1000,
    alpha0: Math.round((8 + r() * 14) * (r() < 0.5 ? -1 : 1)), ecc: Math.round((0.3 + r() * 0.5) * 10) / 10 };
}
export const circumference = (s) => 2 * Math.PI * s.r * 100;   // cm, measured with a thread
export const coilField = (s, n, I) => (MU0 * n * I) / (2 * s.r);
// Needle azimuth (deg, from magnetic north towards east) with the coil turned alpha degrees from the meridian.
// The coil's field is perpendicular to its plane: direction 90 + alpha. dir = +1 or -1 (commutator).
export function needleAzimuth(s, n, I, alpha, dir) {
  const Bc = dir * coilField(s, n, I), east = s.BH + 0 * 0, a = alpha * RAD;
  const E = Bc * Math.cos(a), N = s.BH - Bc * Math.sin(a);
  return Math.atan2(E, N) * DEG;
}
// Deflection read on the scale (scale turns with the coil), and the two pointer ends (eccentric pivot)
export function deflection(s, n, I, alpha, dir) { return needleAzimuth(s, n, I, alpha, dir) - alpha; }
const q = (v) => Math.round(v / LC_TH) * LC_TH;
export function pointerReadings(s, n, I, alpha, dir) {
  const d = deflection(s, n, I, alpha, dir);
  return { t1: q(Math.abs(d) + s.ecc), t2: q(Math.abs(d) - s.ecc), side: d >= 0 ? 'east' : 'west', raw: d };
}
export const reductionFactor = (I, thetaDeg) => I / Math.tan(thetaDeg * RAD);
export const BHfrom = (n, K, rMeters) => (MU0 * n * K) / (2 * rMeters);
