// Prism, angle of minimum deviation. DOM-free so it can be tested in node.
// 2D coordinates: x to the right, y up. The incident ray travels along +x through the origin,
// which is the point of incidence M1 at the middle of the first face.
export const A = 60;            // prism angle, degrees
export const FACE = 14;         // face length, cm
export const I_MIN = 30, I_MAX = 75;
const RAD = Math.PI / 180, DEG = 180 / Math.PI;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// hidden refractive index 1.480 - 1.660 in steps of 0.005
export function newPrism(seed) {
  const r = mulberry32(seed);
  return { seed, n: Math.round((1.48 + r() * 0.18) / 0.005) * 0.005 };
}

// Closed-form path for angle of incidence i (degrees)
export function analytic(n, i) {
  const r1 = Math.asin(Math.sin(i * RAD) / n) * DEG;
  const r2 = A - r1;
  const s = n * Math.sin(r2 * RAD);
  if (s > 1) return { tir: true, r1, r2, e: null, delta: null };
  const e = Math.asin(s) * DEG;
  return { tir: false, r1, r2, e, delta: i + e - A };
}
export const minDeviation = (n) => 2 * Math.asin(n * Math.sin((A / 2) * RAD)) * DEG - A;
export const indexFrom = (dm) => Math.sin(((A + dm) / 2) * RAD) / Math.sin((A / 2) * RAD);

// Protractor reading error: up to +/-0.1 degree, repeatable
export function readingNoise(prism, i) {
  const s = Math.sin(i * 12.9898 + prism.seed * 78.233) * 43758.5453;
  return ((s - Math.floor(s)) - 0.5) * 0.2;
}
export function deltaReading(prism, i) {
  const a = analytic(prism.n, i);
  if (a.tir) return null;
  return Math.round((a.delta + readingNoise(prism, i)) * 10) / 10;
}

// Slope of the i-delta curve (degrees per degree), used for a gentle hint
export function slope(n, i) {
  const a = analytic(n, i - 0.25), b = analytic(n, i + 0.25);
  if (a.tir || b.tir) return null;
  return (b.delta - a.delta) / 0.5;
}

// ---- geometric ray trace (used for the 3D drawing) ----
function rot(p, ang) { const c = Math.cos(ang), s = Math.sin(ang); return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }; }
const dot = (a, b) => a.x * b.x + a.y * b.y;
function refract(d, nrm, eta) {   // nrm points back towards the side the ray comes from
  const cosi = -dot(d, nrm), k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;
  const q = eta * cosi - Math.sqrt(k);
  return { x: eta * d.x + q * nrm.x, y: eta * d.y + q * nrm.y };
}
// Prism vertices with M1 at the origin for rotation phi = 0 (apex up, base below)
export function prismVertices(phiDeg) {
  const alpha = (90 - A / 2) * RAD, b = FACE * Math.sin((A / 2) * RAD);
  const t = { x: Math.cos(alpha), y: Math.sin(alpha) };
  const B1 = { x: -(FACE / 2) * t.x, y: -(FACE / 2) * t.y };
  const V = { x: (FACE / 2) * t.x, y: (FACE / 2) * t.y };
  const B2 = { x: B1.x + 2 * b, y: B1.y };
  return [B1, V, B2].map((p) => rot(p, phiDeg * RAD));
}
// phi = A/2 - i  (rotation of the prism, degrees)
export const phiForI = (i) => A / 2 - i;
export function trace(n, i) {
  const [B1, V, B2] = prismVertices(phiForI(i));
  const cen = { x: (B1.x + V.x + B2.x) / 3, y: (B1.y + V.y + B2.y) / 3 };
  const outward = (p, q) => { const e = { x: q.x - p.x, y: q.y - p.y }, L = Math.hypot(e.x, e.y); let nn = { x: e.y / L, y: -e.x / L };
    const mid = { x: (p.x + q.x) / 2 - cen.x, y: (p.y + q.y) / 2 - cen.y }; if (dot(nn, mid) < 0) nn = { x: -nn.x, y: -nn.y }; return nn; };
  const n1 = outward(B1, V), n2 = outward(V, B2);
  const d0 = { x: 1, y: 0 };
  const d1 = refract(d0, n1, 1 / n);
  if (!d1) return { tir: true };
  // exit point on face 2 (line through V with normal n2)
  const tExit = dot({ x: V.x - 0, y: V.y - 0 }, n2) / dot(d1, n2);
  const exit = { x: d1.x * tExit, y: d1.y * tExit };
  const d2 = refract(d1, { x: -n2.x, y: -n2.y }, n);
  if (!d2) return { tir: true, entry: { x: 0, y: 0 }, exit };
  return { tir: false, entry: { x: 0, y: 0 }, exit, dirOut: d2, deltaDeg: -Math.atan2(d2.y, d2.x) * DEG, verts: [B1, V, B2] };
}

// Least-squares quadratic y = a x^2 + b x + c and its minimum
export function quadFit(pts) {
  const n = pts.length; if (n < 3) return null;
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
  pts.forEach((p) => { const x = p.x, y = p.y, x2 = x * x; s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2; t0 += y; t1 += x * y; t2 += x2 * y; });
  // solve [s4 s3 s2; s3 s2 s1; s2 s1 n][a b c] = [t2 t1 t0]
  const M = [[s4, s3, s2, t2], [s3, s2, s1, t1], [s2, s1, n, t0]];
  for (let c = 0; c < 3; c++) {
    let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; }
  }
  const a = M[0][3] / M[0][0], b = M[1][3] / M[1][1], c = M[2][3] / M[2][2];
  if (a <= 0) return { a, b, c, xmin: null, ymin: null };
  const xmin = -b / (2 * a); return { a, b, c, xmin, ymin: a * xmin * xmin + b * xmin + c };
}

// Estimate the minimum from recorded points: fit a parabola only to readings within +/-7.5 deg of the lowest one
export function fitMinimum(pts, halfWidth = 7.5) {
  if (!pts || pts.length < 5) return null;
  const low = pts.reduce((a, p) => (p.y < a.y ? p : a), pts[0]);
  const sel = pts.filter((p) => Math.abs(p.x - low.x) <= halfWidth + 1e-9);
  if (sel.length < 4) return null;
  const f = quadFit(sel);
  return f && f.xmin != null ? f : null;
}
