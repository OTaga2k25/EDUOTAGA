// Travelling microscope: refractive index of a glass slab. DOM-free so it can be tested in Node.
// Readings are in cm. Main scale divisions 0.05 cm, vernier 50 divisions, least count 0.001 cm.
export const MSD = 0.05, VDIV = 50, LC = MSD / VDIV;   // 0.001 cm
export const R_MIN = 0, R_MAX = 12;                    // travel of the microscope, cm
export const DOF = 0.004;                              // depth of focus: the image looks sharp within about +/-0.004 cm
export const SLABS = [1.0, 1.5, 2.0];                  // nominal thicknesses of the three slabs (cm)

export function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r3 = (v) => Math.round(v * 1000) / 1000;
// A hidden glass and a set of three slabs of it. r0 is the scale reading when focused on the table top.
export function newGlass(seed) {
  const r = mulberry32(seed);
  const n = Math.round((1.48 + r() * 0.1) / 0.005) * 0.005;
  const r0 = r3(2 + r() * 2);
  const t = SLABS.map((s) => r3(s + (r() - 0.5) * 0.12));
  return { seed, n, r0, t };
}
// Positions (scale readings) of the three things that can be focused
export const markReading = (g) => g.r0;
export const imageReading = (g, k) => g.r0 + g.t[k] * (1 - 1 / g.n);   // the mark seen through slab k, raised by t(1 - 1/n)
export const topReading = (g, k) => g.r0 + g.t[k];                      // the powder on top of slab k
export const shift = (g, k) => g.t[k] * (1 - 1 / g.n);

// What is visible in the eyepiece. scene: 'none' | 'slab' | 'powder'
// Returns the planes with their blur (0 = perfectly sharp; 1 = edge of acceptable focus).
export function view(g, k, scene, R) {
  const planes = [];
  if (scene === 'none') planes.push({ what: 'mark', at: markReading(g) });
  else {
    planes.push({ what: 'mark', at: imageReading(g, k) });
    if (scene === 'powder') planes.push({ what: 'powder', at: topReading(g, k) });
  }
  return planes.map((p) => ({ ...p, blur: Math.abs(R - p.at) / DOF }));
}
// The thing the student is meant to focus on in each stage
export function target(scene) { return scene === 'none' ? 'mark' : scene === 'slab' ? 'mark' : 'powder'; }
export function isSharp(g, k, scene, R) {
  const p = view(g, k, scene, R).find((q) => q.what === target(scene));
  return p.blur <= 1;
}

// Vernier: split a reading into main scale reading (cm) and vernier coincidence (division)
export function vernier(R) {
  const units = Math.round(R / LC);                 // in least counts
  const msr = Math.floor(units / VDIV) * MSD;
  const vsc = units % VDIV;
  return { msr: Math.round(msr * 100) / 100, vsc, total: r3(msr + vsc * LC) };
}
export const total = (msr, vsc) => r3(msr + vsc * LC);
// Is the student's reading right? Allows a one-division slip on the vernier.
export function checkReading(R, msr, vsc) {
  const v = vernier(R), tot = total(msr, vsc), diff = Math.round((tot - v.total) / LC);
  if (Math.abs(diff) <= 1) return { ok: true, v, tot };
  let why;
  if (Math.abs(msr - v.msr) > 1e-9) why = Math.abs(msr - v.msr - MSD) < 1e-9 ? 'msr-high' : Math.abs(v.msr - msr - MSD) < 1e-9 ? 'msr-low' : 'msr';
  else why = 'vsc';
  return { ok: false, v, tot, why };
}
export function indexFrom(R1, R2, R3) { const real = R3 - R1, app = R3 - R2; return app > 0 ? real / app : null; }
