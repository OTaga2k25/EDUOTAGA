// Sonometer physics core. DOM-free so it can be tested in node.
// Wire: steel, 0.25 mm diameter -> linear density mu = 3.8e-4 kg/m.
// Tension comes from a hanger (0.5 kg) plus slotted weights (0.5 kg each).
export const G = 9.8;
export const MU = 3.8e-4;                 // kg per metre
export const HANGER = 0.5;                // kg
export const SLOT = 0.5;                  // kg per slotted weight
export const WIRE_CM = 100;               // span between the fixed bridge and the far end
export const KNOWN_FORKS = [256, 288, 320, 384, 480, 512];
export const MIN_L = 8, MAX_L = 98;       // usable bridge range, cm
export const HALF_WIDTH = 0.7;            // cm, resonance half-width
export const JUMP_AMP = 0.8;              // rider leaves the wire above this amplitude (|dL| < 0.35 cm)

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const massKg = (n) => HANGER + SLOT * n;
export const tension = (n) => massKg(n) * G;
export const waveSpeed = (n) => Math.sqrt(tension(n) / MU);

// A session = hidden unknown fork + a small constant end correction.
export function newSession(seed) {
  const r = mulberry32(seed);
  let fx;
  do { fx = 262 + Math.floor(r() * 237); }            // 262..498 Hz
  while (KNOWN_FORKS.some((k) => Math.abs(k - fx) < 6));
  const endCorr = 0.05 + r() * 0.2;                   // cm, added to every resonance length
  return { seed, fx, endCorr };
}

// small per-fork scatter (deterministic) of +/-0.06 cm
function scatter(sess, f) {
  const s = Math.sin(f * 12.9898 + sess.seed * 78.233) * 43758.5453;
  return ((s - Math.floor(s)) - 0.5) * 0.12;
}

// Resonant bridge position (cm) for fork frequency f with n slotted weights.
export function resonanceL(sess, f, n) {
  const L0 = (100 / (2 * f)) * waveSpeed(n);          // cm (v in m/s -> L in m -> *100)
  return L0 + sess.endCorr + scatter(sess, f);
}
export const inRange = (L) => L >= MIN_L && L <= MAX_L;

export function amplitude(L, Lres) {
  const d = (L - Lres) / HALF_WIDTH;
  return 1 / (1 + d * d);
}
export const riderJumps = (L, Lres) => amplitude(L, Lres) >= JUMP_AMP;

// ---- analysis helpers (what a student computes) ----
export const product = (f, L) => f * L;               // Hz*cm
export function meanProduct(rows) {                   // rows: [{f, L}]
  if (!rows.length) return null;
  return rows.reduce((s, r) => s + r.f * r.L, 0) / rows.length;
}
export function fxFrom(rows, Lx) {
  const m = meanProduct(rows);
  return m == null ? null : m / Lx;
}
// Best-fit slope of f against 1/L (L in metres) through the origin; v = 2*slope
export function slopeFvsInvL(rows) {
  let sxy = 0, sxx = 0;
  rows.forEach((r) => { const x = 100 / r.L; sxy += x * r.f; sxx += x * x; });
  return sxx ? sxy / sxx : null;
}
