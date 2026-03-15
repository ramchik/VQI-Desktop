// ─── Statistical Utility Functions ───────────────────────────────────────────
// Implements Welch's t-test, Chi-squared, and Fisher's exact test with
// exact p-values via the regularized incomplete gamma/beta functions.
// No external dependencies required.

// ─── Descriptive ─────────────────────────────────────────────────────────────

export function mean(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function std(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  if (v.length < 2) return null;
  const m = mean(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

export function median(arr) {
  const v = [...arr.filter(x => x != null && !isNaN(x))].sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 === 0 ? (v[m - 1] + v[m]) / 2 : v[m];
}

export function iqr(arr) {
  const v = [...arr.filter(x => x != null && !isNaN(x))].sort((a, b) => a - b);
  if (v.length < 4) return [null, null];
  const q1 = v[Math.floor(v.length * 0.25)];
  const q3 = v[Math.floor(v.length * 0.75)];
  return [q1, q3];
}

export function calcAge(dob) {
  if (!dob) return null;
  const today = new Date(), b = new Date(dob);
  return today.getFullYear() - b.getFullYear() -
    (today < new Date(today.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}

// ─── Gamma / Beta special functions ──────────────────────────────────────────

function logGamma(z) {
  // Lanczos approximation (g=7, n=9)
  const C = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = C[0];
  for (let i = 1; i < 9; i++) x += C[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Regularized incomplete gamma P(a,x) — series expansion (accurate for x < a+1)
function gammaPSeries(a, x) {
  let sum = 1 / a, term = sum;
  for (let n = 1; n <= 300; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

// Regularized incomplete gamma Q(a,x) — continued fraction (accurate for x > a+1)
function gammaQCF(a, x) {
  let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function gammaP(a, x) {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;
  return x < a + 1 ? Math.min(1, gammaPSeries(a, x)) : Math.max(0, 1 - gammaQCF(a, x));
}

// Regularized incomplete beta I_x(a,b) — Lentz continued fraction
function betaI(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Use symmetry relation for better convergence
  if (x > (a + 1) / (a + b + 2)) return 1 - betaI(1 - x, b, a);
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;
  // Lentz method
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    // Even term
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; h *= d * c;
    // Odd term
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return front * h;
}

// ─── CDF functions ────────────────────────────────────────────────────────────

// Chi-squared CDF: P(X² ≤ x) with k degrees of freedom
function chiSquaredCDF(x, k) {
  if (x <= 0) return 0;
  return gammaP(k / 2, x / 2);
}

// t-distribution CDF: P(T ≤ t) with df degrees of freedom (two-tailed area)
function tDistCDF(t, df) {
  const x = df / (df + t * t);
  return 1 - betaI(x, df / 2, 0.5);
}

// ─── Hypothesis tests ─────────────────────────────────────────────────────────

/**
 * Welch's two-sample t-test (unequal variances assumed).
 * Returns { t, df, p } where p is two-tailed.
 */
export function tTest(a, b) {
  const va = a.filter(x => x != null && !isNaN(x));
  const vb = b.filter(x => x != null && !isNaN(x));
  if (va.length < 2 || vb.length < 2) return null;
  const ma = mean(va), mb = mean(vb);
  const sa2 = va.reduce((s, x) => s + (x - ma) ** 2, 0) / (va.length - 1);
  const sb2 = vb.reduce((s, x) => s + (x - mb) ** 2, 0) / (vb.length - 1);
  const se = Math.sqrt(sa2 / va.length + sb2 / vb.length);
  if (se === 0) return { t: 0, df: va.length + vb.length - 2, p: 1 };
  const t = (ma - mb) / se;
  // Welch-Satterthwaite degrees of freedom
  const df = (sa2 / va.length + sb2 / vb.length) ** 2 /
    ((sa2 / va.length) ** 2 / (va.length - 1) + (sb2 / vb.length) ** 2 / (vb.length - 1));
  const p = 2 * (1 - tDistCDF(Math.abs(t), df));
  return { t: +t.toFixed(3), df: +df.toFixed(1), p: clamp01(p) };
}

/**
 * Pearson chi-squared test for k categories, two groups.
 * counts1[i] and counts2[i] are observed counts in group 1 and 2 for category i.
 * Returns { chi2, df, p }.
 */
export function chiSquaredTest(counts1, counts2) {
  const n1 = counts1.reduce((a, b) => a + b, 0);
  const n2 = counts2.reduce((a, b) => a + b, 0);
  const n = n1 + n2;
  if (n === 0 || n1 === 0 || n2 === 0) return null;
  let chi2 = 0;
  for (let i = 0; i < counts1.length; i++) {
    const rowTotal = counts1[i] + counts2[i];
    const e1 = rowTotal * n1 / n;
    const e2 = rowTotal * n2 / n;
    if (e1 > 0) chi2 += (counts1[i] - e1) ** 2 / e1;
    if (e2 > 0) chi2 += (counts2[i] - e2) ** 2 / e2;
  }
  const df = counts1.length - 1;
  const p = df > 0 ? clamp01(1 - chiSquaredCDF(chi2, df)) : 1;
  return { chi2: +chi2.toFixed(3), df, p };
}

/**
 * Fisher's exact test for 2×2 tables.
 * a = Group1+Category1, b = Group1+Category2
 * c = Group2+Category1, d = Group2+Category2
 * Returns { p } (two-tailed via summing extreme probabilities).
 */
export function fisherExact(a, b, c, d) {
  const n = a + b + c + d;
  if (n === 0) return null;
  function logHypergeometric(a, b, c, d) {
    const n = a + b + c + d;
    return logGamma(a + b + 1) + logGamma(c + d + 1) + logGamma(a + c + 1) + logGamma(b + d + 1)
      - logGamma(n + 1) - logGamma(a + 1) - logGamma(b + 1) - logGamma(c + 1) - logGamma(d + 1);
  }
  const pObs = Math.exp(logHypergeometric(a, b, c, d));
  const rowTotal1 = a + b, rowTotal2 = c + d, colTotal1 = a + c;
  let p = 0;
  const minA = Math.max(0, colTotal1 - rowTotal2);
  const maxA = Math.min(colTotal1, rowTotal1);
  for (let aa = minA; aa <= maxA; aa++) {
    const bb = rowTotal1 - aa, cc = colTotal1 - aa, dd = rowTotal2 - cc;
    if (bb < 0 || cc < 0 || dd < 0) continue;
    const pCell = Math.exp(logHypergeometric(aa, bb, cc, dd));
    if (pCell <= pObs + 1e-10) p += pCell;
  }
  return { p: clamp01(p) };
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format a p-value for display in a table.
 * "<0.001", "0.023", "0.541", etc.
 */
export function formatP(p, result = null) {
  if (p == null || isNaN(p)) return '—';
  if (p < 0.001) return '<0.001';
  if (p < 0.01) return p.toFixed(3);
  return p.toFixed(3);
}

/** Returns CSS color for p-value significance */
export function pColor(p) {
  if (p == null) return '#64748b';
  if (p < 0.001) return '#ef4444';
  if (p < 0.01) return '#f97316';
  if (p < 0.05) return '#f59e0b';
  return '#94a3b8';
}

/** Returns significance asterisks */
export function pAsterisks(p) {
  if (p == null) return '';
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return 'ns';
}

// ─── Summary Statistics ───────────────────────────────────────────────────────

/**
 * Compute summary statistics for one group's array of raw values.
 * type: 'continuous' | 'binary' | 'categorical'
 * Returns { n, missing, ...type-specific stats }
 */
export function summarize(values, type, total) {
  const n = total ?? values.length;
  const present = values.filter(v => v != null && v !== '');
  const missing = n - present.length;

  if (type === 'continuous') {
    const nums = present.map(Number).filter(v => !isNaN(v));
    const m = mean(nums), s = std(nums), med = median(nums), [q1, q3] = iqr(nums);
    return {
      n: nums.length, missing,
      mean: m != null ? +m.toFixed(1) : null,
      sd: s != null ? +s.toFixed(1) : null,
      median: med != null ? +med.toFixed(1) : null,
      q1: q1 != null ? +q1.toFixed(1) : null,
      q3: q3 != null ? +q3.toFixed(1) : null,
      raw: nums
    };
  }

  if (type === 'binary') {
    const nums = present.map(Number);
    const count = nums.filter(v => v === 1).length;
    return { n: nums.length, missing, count, pct: nums.length ? +((count / nums.length) * 100).toFixed(1) : null, raw: nums };
  }

  if (type === 'categorical') {
    const cats = {};
    present.forEach(v => { if (v != null && v !== '') cats[v] = (cats[v] || 0) + 1; });
    return { n: present.length, missing, cats };
  }

  return { n: 0, missing: n };
}

/**
 * Compute p-value comparing two groups for a given variable type.
 * For 'binary'/'categorical' uses chi-squared or Fisher's exact (small samples).
 * For 'continuous' uses Welch's t-test.
 */
export function computeP(statsA, statsB, type) {
  if (!statsA || !statsB) return null;
  if (type === 'continuous') {
    if (!statsA.raw?.length || !statsB.raw?.length) return null;
    const res = tTest(statsA.raw, statsB.raw);
    return res?.p ?? null;
  }
  if (type === 'binary') {
    const a = statsA.count, b = statsA.n - statsA.count;
    const c = statsB.count, d = statsB.n - statsB.count;
    if (a + b + c + d === 0) return null;
    const minExpected = Math.min(
      (a + c) * (a + b) / (a + b + c + d),
      (b + d) * (a + b) / (a + b + c + d)
    );
    if (minExpected < 5) {
      const res = fisherExact(a, b, c, d);
      return res?.p ?? null;
    }
    const res = chiSquaredTest([a, b], [c, d]);
    return res?.p ?? null;
  }
  if (type === 'categorical') {
    const allCats = [...new Set([...Object.keys(statsA.cats || {}), ...Object.keys(statsB.cats || {})])];
    if (allCats.length < 2) return null;
    const c1 = allCats.map(k => statsA.cats[k] || 0);
    const c2 = allCats.map(k => statsB.cats[k] || 0);
    const res = chiSquaredTest(c1, c2);
    return res?.p ?? null;
  }
  return null;
}
