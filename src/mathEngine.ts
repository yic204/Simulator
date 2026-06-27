/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chemical, TitrationType, Indicator, TitrationPreset, TitrationStepResult } from "./types";

// Thermodynamic water dissociation constant Kw as a function of Temp in Kelvin
export function getKw(tempCelsius: number): number {
  const Tk = tempCelsius + 273.15;
  // Standard empirical formula for pKw
  const pKw = 4471.33 / Tk - 6.0846 + 0.017053 * Tk;
  return Math.pow(10, -pKw);
}

// Limit molar conductivities in mS*m^2/mol (at 25°C)
// H+: 34.96, OH-: 19.91, Na+: 5.01, Cl-: 7.63, CH3COO-: 4.09, NH4+: 7.35, General Cation: 5.0, General Anion: 5.0
const LAMBDA_H = 34.96;
const LAMBDA_OH = 19.91;
const LAMBDA_NA = 5.01;
const LAMBDA_K = 7.35;
const LAMBDA_CL = 7.63;
const LAMBDA_CH3COO = 4.09;
const LAMBDA_NH4 = 7.35;
const LAMBDA_GENERAL_CATION = 5.0;
const LAMBDA_GENERAL_ANION = 5.0;

export const INDICATORS: Indicator[] = [
  { name: "Phenolphthalein", minPh: 8.2, maxPh: 10.0, acidColor: "#FFFFFF", baseColor: "#EC4899" }, // Colorless to Magenta
  { name: "Methyl Orange", minPh: 3.1, maxPh: 4.4, acidColor: "#EF4444", baseColor: "#FACC15" }, // Red to Yellow
  { name: "Methyl Red", minPh: 4.4, maxPh: 6.2, acidColor: "#EF4444", baseColor: "#FACC15" }, // Red to Yellow
  { name: "Bromothymol Blue", minPh: 6.0, maxPh: 7.6, acidColor: "#EAB308", baseColor: "#1D4ED8" }, // Yellow to Blue
  { name: "Litmus", minPh: 4.5, maxPh: 8.3, acidColor: "#EF4444", baseColor: "#2563EB" }, // Red to Blue
  { name: "Universal Indicator", minPh: 1.0, maxPh: 14.0, acidColor: "#EF4444", baseColor: "#7C3AED" }, // Full rainbow
];

// Linear color interpolator for hex colors
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const f = Math.max(0, Math.min(1, factor));
  const c1 = color1.startsWith("#") ? color1.slice(1) : "ffffff";
  const c2 = color2.startsWith("#") ? color2.slice(1) : "ffffff";

  // Parse r, g, b
  const r1 = parseInt(c1.substring(0, 2), 16);
  const g1 = parseInt(c1.substring(2, 4), 16);
  const b1 = parseInt(c1.substring(4, 6), 16);

  const r2 = parseInt(c2.substring(0, 2), 16);
  const g2 = parseInt(c2.substring(2, 4), 16);
  const b2 = parseInt(c2.substring(4, 6), 16);

  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);

  const rs = r.toString(16).padStart(2, "0");
  const gs = g.toString(16).padStart(2, "0");
  const bs = b.toString(16).padStart(2, "0");

  return `#${rs}${gs}${bs}`;
}

export function getIndicatorColor(ph: number, name: string): string {
  const indicator = INDICATORS.find((i) => i.name === name) || INDICATORS[0];
  
  if (name === "Universal Indicator") {
    // Custom fine-grained scale for Universal Indicator
    // pH 1-2: Red, 3-4: Orange, 5-6: Yellow-Orange, 7: Green, 8: Blue-Green, 9: Blue, 10-11: Dark Blue, 12-14: Purple
    const stops = [
      { ph: 1, color: "#EF4444" },  // Red
      { ph: 3, color: "#F97316" },  // Orange
      { ph: 5, color: "#FACC15" },  // Yellow
      { ph: 7, color: "#22C55E" },  // Green
      { ph: 9, color: "#06B6D4" },  // Teal
      { ph: 11, color: "#3B82F6" }, // Blue
      { ph: 13, color: "#8B5CF6" }, // Purple
      { ph: 14, color: "#4C1D95" }, // Indigo
    ];
    if (ph <= stops[0].ph) return stops[0].color;
    if (ph >= stops[stops.length - 1].ph) return stops[stops.length - 1].color;
    for (let i = 0; i < stops.length - 1; i++) {
      if (ph >= stops[i].ph && ph <= stops[i+1].ph) {
        const factor = (ph - stops[i].ph) / (stops[i+1].ph - stops[i].ph);
        return interpolateColor(stops[i].color, stops[i+1].color, factor);
      }
    }
  }

  // Henderson-Hasselbalch interpolation for chemical indicators
  const pKIn = (indicator.minPh + indicator.maxPh) / 2;
  const ratio = Math.pow(10, ph - pKIn);
  const factor = ratio / (1 + ratio); // Fraction of base form
  
  // Outside standard bounds, force absolute ends for clarity
  if (ph < indicator.minPh) return indicator.acidColor;
  if (ph > indicator.maxPh) return indicator.baseColor;

  return interpolateColor(indicator.acidColor, indicator.baseColor, factor);
}

// Preset configurations
export const PRESETS: TitrationPreset[] = [
  {
    id: "hcl_naoh",
    name: "Strong Acid + Strong Base",
    arabicName: "حمض قوي + قاعدة قوية",
    type: TitrationType.StrongAcid_StrongBase,
    analyte: {
      name: "Hydrochloric Acid",
      formula: "HCl",
      isAcid: true,
      isStrong: true,
      concentration: 0.1,
      initialVolume: 50.0,
      purity: 100,
    },
    titrant: {
      name: "Sodium Hydroxide",
      formula: "NaOH",
      isAcid: false,
      isStrong: true,
      concentration: 0.1,
      initialVolume: 0,
    },
    recommendedIndicator: "Phenolphthalein",
    description: "Titration of 0.1 M HCl with 0.1 M NaOH. The equivalence point occurs exactly at pH 7.00. The curve shows a very sharp vertical transition.",
    arabicDescription: "معايرة حمض الهيدروكلوريك 0.1 مولار مع هيدروكسيد الصوديوم 0.1 مولار. نقطة التكافؤ تقع تمامًا عند أس هيدروجيني 7.00. المنحنى يظهر قفزة عمودية حادة جدًا."
  },
  {
    id: "ch3cooh_naoh",
    name: "Weak Acid + Strong Base",
    arabicName: "حمض ضعيف + قاعدة قوية",
    type: TitrationType.WeakAcid_StrongBase,
    analyte: {
      name: "Acetic Acid",
      formula: "CH3COOH",
      isAcid: true,
      isStrong: false,
      Ka: [1.8e-5], // pKa = 4.74
      concentration: 0.1,
      initialVolume: 50.0,
      purity: 100,
    },
    titrant: {
      name: "Sodium Hydroxide",
      formula: "NaOH",
      isAcid: false,
      isStrong: true,
      concentration: 0.1,
      initialVolume: 0,
    },
    recommendedIndicator: "Phenolphthalein",
    description: "Titration of 0.1 M CH3COOH (acetic acid) with 0.1 M NaOH. The equivalence point is basic (pH ≈ 8.72) due to hydrolysis of acetate ion. The buffer region is prominent around pH 4.74.",
    arabicDescription: "معايرة حمض الأسيتيك 0.1 مولار مع هيدروكسيد الصوديوم 0.1 مولار. نقطة التكافؤ قاعدية (pH ≈ 8.72) بسبب تميؤ أيون الأسيتات. تظهر منطقة المحلول المنظم بوضوح حول pH 4.74."
  },
  {
    id: "nh3_hcl",
    name: "Strong Acid + Weak Base",
    arabicName: "حمض قوي + قاعدة ضعيفة",
    type: TitrationType.StrongAcid_WeakBase,
    analyte: {
      name: "Ammonia Solution",
      formula: "NH3",
      isAcid: false,
      isStrong: false,
      Kb: 1.8e-5, // pKb = 4.74, pKa of conjugate NH4+ = 9.26
      concentration: 0.1,
      initialVolume: 50.0,
      purity: 100,
    },
    titrant: {
      name: "Hydrochloric Acid",
      formula: "HCl",
      isAcid: true,
      isStrong: true,
      concentration: 0.1,
      initialVolume: 0,
    },
    recommendedIndicator: "Methyl Red",
    description: "Titration of 0.1 M NH3 with 0.1 M HCl. The equivalence point is acidic (pH ≈ 5.28) due to ammonium conjugate acid hydrolysis. Buffer region around pH 9.26.",
    arabicDescription: "معايرة الأمونيا 0.1 مولار مع حمض الهيدروكلوريك 0.1 مولار. نقطة التكافؤ حمضية (pH ≈ 5.28) بسبب تميؤ حمض الأمونيوم المرافق. تظهر منطقة المحلول المنظم حول pH 9.26."
  },
  {
    id: "h3po4_naoh",
    name: "Polyprotic Acid + Strong Base",
    arabicName: "حمض متعدد البروتونات + قاعدة قوية",
    type: TitrationType.PolyproticAcid_StrongBase,
    analyte: {
      name: "Phosphoric Acid",
      formula: "H3PO4",
      isAcid: true,
      isStrong: false,
      Ka: [7.11e-3, 6.32e-8, 4.5e-13], // pKa1 = 2.15, pKa2 = 7.20, pKa3 = 12.35
      concentration: 0.1,
      initialVolume: 50.0,
      purity: 100,
    },
    titrant: {
      name: "Sodium Hydroxide",
      formula: "NaOH",
      isAcid: false,
      isStrong: true,
      concentration: 0.1,
      initialVolume: 0,
    },
    recommendedIndicator: "Universal Indicator",
    description: "Triprotic phosphoric acid has three distinct equivalence points. The first is around pH 4.7, the second around pH 9.7. The third is difficult to observe experimentally due to extremely low Ka3.",
    arabicDescription: "حمض الفوسفوريك ثلاثي البروتون له ثلاث نقاط تكافؤ متميزة. الأولى حول pH 4.7، والثانية حول pH 9.7. الثالثة يصعب ملاحظتها مخبريًا بسبب الصغر الشديد لـ Ka3."
  },
  {
    id: "h2co3_naoh",
    name: "Diprotic Acid + Strong Base",
    arabicName: "حمض ثنائي البروتون + قاعدة قوية",
    type: TitrationType.PolyproticAcid_StrongBase,
    analyte: {
      name: "Carbonic Acid",
      formula: "H2CO3",
      isAcid: true,
      isStrong: false,
      Ka: [4.3e-7, 5.6e-11], // pKa1 = 6.37, pKa2 = 10.25
      concentration: 0.1,
      initialVolume: 50.0,
      purity: 100,
    },
    titrant: {
      name: "Sodium Hydroxide",
      formula: "NaOH",
      isAcid: false,
      isStrong: true,
      concentration: 0.1,
      initialVolume: 0,
    },
    recommendedIndicator: "Phenolphthalein",
    description: "Carbonic acid H2CO3 titration showing two steps. The first equivalence point is bicarbonate (pH ≈ 8.3), and the second is carbonate (pH ≈ 11.6). Important for blood buffering physiology.",
    arabicDescription: "معايرة حمض الكربونيك H2CO3 تظهر مرحلتين. نقطة التكافؤ الأولى هي البيكربونات (pH ≈ 8.3)، والثانية هي الكربونات (pH ≈ 11.6). مهمة لفيزيولوجيا تنظيم الدم."
  },
  {
    id: "ch3cooh_nh3",
    name: "Weak Acid + Weak Base",
    arabicName: "حمض ضعيف + قاعدة ضعيفة",
    type: TitrationType.WeakAcid_WeakBase,
    analyte: {
      name: "Acetic Acid",
      formula: "CH3COOH",
      isAcid: true,
      isStrong: false,
      Ka: [1.8e-5],
      concentration: 0.1,
      initialVolume: 50.0,
      purity: 100,
    },
    titrant: {
      name: "Ammonia Solution",
      formula: "NH3",
      isAcid: false,
      isStrong: false,
      Kb: 1.8e-5,
      concentration: 0.1,
      initialVolume: 0,
    },
    recommendedIndicator: "Universal Indicator",
    description: "Titration of a weak acid (CH3COOH) with a weak base (NH3). The curve has a very flat inflection point and no sharp pH jump, making visual indicator titration highly difficult.",
    arabicDescription: "معايرة حمض ضعيف مع قاعدة ضعيفة. المنحنى يتميز بنقطة انعطاف مسطحة للغاية وبدون قفزة حادة في الأس الهيدروجيني، مما يجعل المعايرة البصرية صعبة للغاية."
  },
];

// ==========================================
// ROOT FINDING ALGORITHMS (FOR CHEMICAL SOLVER)
// ==========================================

interface RootSolverResult {
  root: number;
  iterations: number;
}

// Bisection fallback when Newton-Raphson diverges
function bisectionSolve(
  f: (x: number) => number,
  min: number,
  max: number,
  tolerance = 1e-12,
  maxIterations = 100
): RootSolverResult {
  let low = min;
  let high = max;
  let mid = (low + high) / 2;
  let i = 0;

  let f_low = f(low);
  let f_high = f(high);

  if (f_low * f_high > 0) {
    // If endpoints have same sign, expand bounds exponentially
    for (let k = 0; k < 10; k++) {
      low *= 0.1;
      high *= 10.0;
      f_low = f(low);
      f_high = f(high);
      if (f_low * f_high < 0) break;
    }
  }

  while (high - low > tolerance && i < maxIterations) {
    mid = (low + high) / 2;
    const f_mid = f(mid);
    if (Math.abs(f_mid) < 1e-15) {
      return { root: mid, iterations: i };
    }
    if (f_low * f_mid < 0) {
      high = mid;
      f_high = f_mid;
    } else {
      low = mid;
      f_low = f_mid;
    }
    i++;
  }
  return { root: (low + high) / 2, iterations: i };
}

// Hybrid Newton-Raphson / Bisection solver (Ridders-like or Safe Newton)
export function solveChargeBalance(
  f: (x: number) => number,
  df: (x: number) => number,
  initialGuess: number,
  minBound = 1e-15,
  maxBound = 1.0,
  tolerance = 1e-11
): number {
  let x = initialGuess;
  const maxIterations = 60;

  for (let i = 0; i < maxIterations; i++) {
    const y = f(x);
    const dy = df(x);

    if (Math.abs(dy) < 1e-30) {
      // Divergent, break to fallback
      break;
    }

    const nextX = x - y / dy;

    if (Math.abs(nextX - x) < tolerance) {
      if (nextX > 0) return nextX;
    }

    // If Newton goes out of bounds or negative, clamp it or break
    if (nextX < minBound || nextX > maxBound || isNaN(nextX)) {
      break;
    }
    x = nextX;
  }

  // Fallback to robust Bisection Solver
  const bisectionRes = bisectionSolve(f, minBound, maxBound, tolerance);
  return bisectionRes.root;
}

// ==========================================
// CORE CHEMICAL pH CALCULATION
// ==========================================

export function calculateTitrationPoint(
  volAdded: number,
  analyte: Chemical,
  titrant: Chemical,
  temp: number
): {
  ph: number;
  h: number;
  oh: number;
  speciesFractions: number[];
  conductivity: number;
  bufferCapacity: number;
  molesAnalyteRemaining: number;
  molesTitrantAdded: number;
  excess: "analyte" | "titrant" | "equivalence";
  explanation: string;
  arabicExplanation: string;
  formulas: string[];
} {
  const Kw = getKw(temp);
  const Va = analyte.initialVolume / 1000.0; // Liters
  const Vb = volAdded / 1000.0; // Liters
  const Vtot = Va + Vb; // Liters

  const Ca = analyte.concentration;
  const Cb = titrant.concentration;

  const molesAnalyteInitial = Ca * Va;
  const molesTitrantAdded = Cb * Vb;

  let ph = 7.0;
  let h = 1e-7;
  let oh = 1e-7;
  let speciesFractions: number[] = [1.0];
  let conductivity = 0;
  let bufferCapacity = 0;
  let excess: "analyte" | "titrant" | "equivalence" = "equivalence";
  let explanation = "";
  let arabicExplanation = "";
  let formulas: string[] = [];

  // Molar ionic concentrations for conductivity
  let concNa = 0;
  let concCl = 0;
  let concAcidAnions: number[] = [];
  let concBaseConjugate = 0;

  // Let's determine what kind of titration we are doing.
  const isAnalyteAcid = analyte.isAcid;

  // ----------------------------------------------------
  // CASE 1: Strong Acid + Strong Base
  // ----------------------------------------------------
  if (analyte.isStrong && titrant.isStrong) {
    const nA = molesAnalyteInitial;
    const nB = molesTitrantAdded;
    
    // Net charge/moles
    const diff = isAnalyteAcid ? (nA - nB) : (nB - nA);
    const D = diff / Vtot; // Net excess strong species concentration

    // Solve [H]^2 + D*[H] - Kw = 0 exactly
    h = (-D + Math.sqrt(D * D + 4 * Kw)) / 2;
    oh = Kw / h;
    ph = -Math.log10(h);

    const molDiff = Math.abs(nA - nB);
    const threshold = 1e-7; // Moles difference threshold for equivalence
    
    if (molDiff < threshold) {
      excess = "equivalence";
      explanation = "Stoichiometric equivalence point. All acid and base have reacted to form salt and water. The pH is determined solely by water autoionization.";
      arabicExplanation = "نقطة التكافؤ الاستوكيمترية. تفاعل كل الحمض والقاعدة لإنتاج ملح وماء. الأس الهيدروجيني يعتمد فقط على التفكك الذاتي للماء.";
    } else if (isAnalyteAcid ? nA > nB : nB > nA) {
      excess = "analyte";
      explanation = `Excess strong acid in solution. Major species are H⁺ and Cl⁻. The pH is governed by the remaining unneutralized acid.`;
      arabicExplanation = `فائض من الحمض القوي في المحلول. الأيونات الرئيسية هي H⁺ و Cl⁻. الأس الهيدروجيني محكوم بالحمض المتبقي دون تعديل.`;
    } else {
      excess = "titrant";
      explanation = `Excess strong base in solution. Major species are Na⁺ and OH⁻. The pH is governed by the excess hydroxide ions.`;
      arabicExplanation = `فائض من القاعدة القوية في المحلول. الأيونات الرئيسية هي Na⁺ و OH⁻. الأس الهيدروجيني محكوم بأيونات الهيدروكسيد الزائدة.`;
    }

    formulas = [
      "[H^+]^2 + D \\cdot [H^+] - K_w = 0",
      `D = \\frac{\\text{Moles Acid} - \\text{Moles Base}}{V_{\\text{total}}}`
    ];

    // Calculate conductivity
    // HCl + NaOH -> NaCl + H2O
    // Ions: H+, OH-, Na+, Cl-
    // Cl- is always from HCl. Na+ is always from NaOH.
    const concCl_tot = isAnalyteAcid ? (Ca * Va) / Vtot : (Cb * Vb) / Vtot;
    const concNa_tot = isAnalyteAcid ? (Cb * Vb) / Vtot : (Ca * Va) / Vtot;
    
    conductivity = (h * LAMBDA_H + oh * LAMBDA_OH + concNa_tot * LAMBDA_NA + concCl_tot * LAMBDA_CL) * 1000; // uS/cm
    bufferCapacity = 2.303 * (h + oh);
    speciesFractions = [1.0];
  }

  // ----------------------------------------------------
  // CASE 2: Weak Acid + Strong Base (e.g. CH3COOH + NaOH)
  // ----------------------------------------------------
  else if (isAnalyteAcid && !analyte.isStrong && titrant.isStrong) {
    const Ka = (analyte.Ka && analyte.Ka[0]) ? analyte.Ka[0] : 1.8e-5;
    const nA_tot = molesAnalyteInitial;
    const nB_added = molesTitrantAdded;
    const C_A_tot = nA_tot / Vtot;
    const C_Na_added = nB_added / Vtot; // [Na+] fully dissolved

    // Charge balance: [H+] + [Na+] = [OH-] + [A-]
    // where [A-] = C_A_tot * Ka / ([H+] + Ka)
    // We solve: x + C_Na_added - Kw/x - C_A_tot * Ka / (x + Ka) = 0
    const f = (x: number) => x + C_Na_added - Kw / x - (C_A_tot * Ka) / (x + Ka);
    const df = (x: number) => 1 + Kw / (x * x) + (C_A_tot * Ka) / ((x + Ka) * (x + Ka));

    // Guess starting pH
    let initialGuess = 1e-3;
    if (nB_added === 0) {
      initialGuess = Math.sqrt(Ka * Ca); // Initial weak acid approx
    } else if (nB_added < nA_tot) {
      // Buffer region estimate
      const phEst = -Math.log10(Ka) + Math.log10(nB_added / (nA_tot - nB_added));
      initialGuess = Math.pow(10, -phEst);
    } else {
      // Excess base estimate
      const excessOH = (nB_added - nA_tot) / Vtot;
      initialGuess = Kw / (excessOH > 0 ? excessOH : 1e-7);
    }

    h = solveChargeBalance(f, df, initialGuess, 1e-15, 10.0);
    oh = Kw / h;
    ph = -Math.log10(h);

    // Alpha values
    const alphaA_minus = Ka / (h + Ka);
    const alphaHA = h / (h + Ka);
    speciesFractions = [alphaHA, alphaA_minus];

    const molDiff = Math.abs(nA_tot - nB_added);
    if (molDiff < 1e-7) {
      excess = "equivalence";
      explanation = `Equivalence point reached (pH ≈ ${ph.toFixed(2)}). All acetic acid neutralized to sodium acetate (CH₃COO⁻Na⁺). The basic pH is due to weak anion hydrolysis: CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻.`;
      arabicExplanation = `تم الوصول إلى نقطة التكافؤ (pH ≈ ${ph.toFixed(2)}). تم تعادل كل حمض الأسيتيك إلى أسيتات الصوديوم. الأس الهيدروجيني القاعدي ناتج عن تميؤ الأنيون الضعيف.`;
    } else if (nA_tot > nB_added) {
      excess = "analyte";
      if (nB_added < 0.05 * nA_tot) {
        explanation = `Initial stage. A small amount of weak acid has dissociated. The pH is driven primarily by weak acid equilibrium.`;
        arabicExplanation = `المرحلة الأولية. تفكك جزء صغير من الحمض الضعيف. الأس الهيدروجيني محكوم بتوازن الحمض الضعيف.`;
      } else {
        explanation = `Buffer Region. Significant amounts of both weak acid (CH₃COOH) and its conjugate base (CH₃COO⁻) exist in solution. The system resists pH changes. Buffer capacity is near maximum at half-equivalence.`;
        arabicExplanation = `منطقة المحلول المنظم. توجد كميات كبيرة من الحمض الضعيف وقاعدته المرافقة في المحلول. يقاوم النظام التغيرات في الأس الهيدروجيني.`;
      }
    } else {
      excess = "titrant";
      explanation = `Post-equivalence. Excess strong base (NaOH) determines the pH. The hydrolysis of CH₃COO⁻ contributes negligibly compared to the added OH⁻.`;
      arabicExplanation = `ما بعد التكافؤ. القاعدة القوية الزائدة تحدد الأس الهيدروجيني. تميؤ أيون الأسيتات مهمل مقارنة بالهيدروكسيد المضاف.`;
    }

    formulas = [
      "[H^+] + [Na^+] = [OH^-] + [A^-]",
      "[A^-] = C_{A, \\text{total}} \\cdot \\frac{K_a}{[H^+] + K_a}",
      "\\text{Henderson-Hasselbalch (Buffer Region): } pH = pK_a + \\log\\frac{[A^-]}{[HA]}"
    ];

    // Conductivity: Na+ is C_Na_added, Acetate is alphaA_minus * C_A_tot, OH- is oh, H+ is h
    const concAcetate = alphaA_minus * C_A_tot;
    conductivity = (h * LAMBDA_H + oh * LAMBDA_OH + C_Na_added * LAMBDA_NA + concAcetate * LAMBDA_CH3COO) * 1000;
    bufferCapacity = 2.303 * (h + oh + (C_A_tot * Ka * h) / ((h + Ka) * (h + Ka)));
  }

  // ----------------------------------------------------
  // CASE 3: Strong Acid + Weak Base (e.g. NH3 + HCl)
  // ----------------------------------------------------
  else if (!isAnalyteAcid && !analyte.isStrong && titrant.isStrong) {
    const Kb = analyte.Kb ? analyte.Kb : 1.8e-5;
    const KaConjugate = Kw / Kb; // ammonium pKa = 9.26
    const nB_tot = molesAnalyteInitial;
    const nA_added = molesTitrantAdded;
    const C_B_tot = nB_tot / Vtot;
    const C_Cl_added = nA_added / Vtot; // Fully dissociated [Cl-] from titrant HCl

    // Charge balance: [H+] + [BH+] = [OH-] + [Cl-]
    // where [BH+] = C_B_tot * [H+] / ([H+] + Ka)
    const f = (x: number) => x + (C_B_tot * x) / (x + KaConjugate) - Kw / x - C_Cl_added;
    const df = (x: number) => 1 + (C_B_tot * KaConjugate) / ((x + KaConjugate) * (x + KaConjugate)) + Kw / (x * x);

    let initialGuess = 1e-9;
    if (nA_added === 0) {
      initialGuess = Kw / Math.sqrt(Kb * Cb);
    } else if (nA_added < nB_tot) {
      const phEst = -Math.log10(KaConjugate) + Math.log10((nB_tot - nA_added) / nA_added);
      initialGuess = Math.pow(10, -phEst);
    } else {
      const excessH = (nA_added - nB_tot) / Vtot;
      initialGuess = excessH > 0 ? excessH : 1e-7;
    }

    h = solveChargeBalance(f, df, initialGuess, 1e-15, 10.0);
    oh = Kw / h;
    ph = -Math.log10(h);

    // Alpha values for ammonia
    const alphaBH_plus = h / (h + KaConjugate);
    const alphaB = KaConjugate / (h + KaConjugate);
    speciesFractions = [alphaB, alphaBH_plus];

    const molDiff = Math.abs(nB_tot - nA_added);
    if (molDiff < 1e-7) {
      excess = "equivalence";
      explanation = `Equivalence point reached (pH ≈ ${ph.toFixed(2)}). All ammonia converted to ammonium chloride (NH₄⁺Cl⁻). The acidic pH is due to conjugate acid hydrolysis: NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺.`;
      arabicExplanation = `تم الوصول إلى نقطة التكافؤ (pH ≈ ${ph.toFixed(2)}). تحولت الأمونيا بالكامل إلى كلوريد الأمونيوم. الأس الهيدروجيني الحمضي ناتج عن تميؤ الحمض المرافق.`;
    } else if (nB_tot > nA_added) {
      excess = "analyte";
      explanation = `Buffer Region. Unreacted weak base (NH₃) and conjugate acid (NH₄⁺) exist in solution. This conjugate pair maintains the pH in the basic/neutral range.`;
      arabicExplanation = `منطقة المحلول المنظم. توجد أمونيا غير متفاعلة وأمونيوم مرافق في المحلول. هذا الزوج يثبت الأس الهيدروجيني.`;
    } else {
      excess = "titrant";
      explanation = `Post-equivalence. Excess hydrochloric acid (HCl) determines the pH. The NH₄⁺ hydrolysis contribution is negligible.`;
      arabicExplanation = `ما بعد التكافؤ. حمض الهيدروكلوريك الزائد يحدد الأس الهيدروجيني. تميؤ NH₄⁺ مهمل مقارنة بالبروتونات المضافة.`;
    }

    formulas = [
      "[H^+] + [BH^+] = [OH^-] + [Cl^-]",
      "[BH^+] = C_{B, \\text{total}} \\cdot \\frac{[H^+]}{[H^+] + K_{a,\\text{conjugate}}}"
    ];

    // Conductivity: Cl- is C_Cl_added, NH4+ is alphaBH_plus * C_B_tot, H+ is h, OH- is oh
    const concAmmonium = alphaBH_plus * C_B_tot;
    conductivity = (h * LAMBDA_H + oh * LAMBDA_OH + C_Cl_added * LAMBDA_CL + concAmmonium * LAMBDA_NH4) * 1000;
    bufferCapacity = 2.303 * (h + oh + (C_B_tot * KaConjugate * h) / ((h + KaConjugate) * (h + KaConjugate)));
  }

  // ----------------------------------------------------
  // CASE 4: Polyprotic Acid + Strong Base (e.g. H3PO4 + NaOH)
  // ----------------------------------------------------
  else if (isAnalyteAcid && !analyte.isStrong && titrant.isStrong && analyte.Ka && analyte.Ka.length > 1) {
    const Kas = analyte.Ka;
    const Ka1 = Kas[0];
    const Ka2 = Kas[1];
    const Ka3 = Kas.length > 2 ? Kas[2] : 0; // Set to 0 if diprotic

    const nA_tot = molesAnalyteInitial;
    const nB_added = molesTitrantAdded;
    const C_A_tot = nA_tot / Vtot;
    const C_Na_added = nB_added / Vtot; // [Na+] fully dissociated

    // We solve the general charge balance equation for polyprotic acid
    // [H+] + [Na+] = [OH-] + C_A_tot * (alpha1 + 2*alpha2 + 3*alpha3)
    // where:
    // D = x^3 + Ka1*x^2 + Ka1*Ka2*x + Ka1*Ka2*Ka3
    // alpha0 = x^3 / D
    // alpha1 = Ka1*x^2 / D (monovalent conjugate base)
    // alpha2 = Ka1*Ka2*x / D (divalent conjugate base)
    // alpha3 = Ka1*Ka2*Ka3 / D (trivalent conjugate base)
    const f = (x: number) => {
      const D_denom = x * x * x + Ka1 * x * x + Ka1 * Ka2 * x + Ka1 * Ka2 * Ka3;
      const alpha1 = (Ka1 * x * x) / D_denom;
      const alpha2 = (Ka1 * Ka2 * x) / D_denom;
      const alpha3 = (Ka1 * Ka2 * Ka3) / D_denom;
      const chargeAcid = alpha1 + 2 * alpha2 + 3 * alpha3;
      return x + C_Na_added - Kw / x - C_A_tot * chargeAcid;
    };

    // Numerical derivative
    const df = (x: number) => {
      const eps = x * 1e-5;
      return (f(x + eps) - f(x)) / eps;
    };

    // Multi-stage guess helper
    let initialGuess = 1e-3;
    const eq1 = nA_tot;
    const eq2 = nA_tot * 2;
    const eq3 = nA_tot * 3;

    if (nB_added === 0) {
      initialGuess = Math.sqrt(Ka1 * Ca);
    } else if (nB_added < eq1) {
      // Stage 1 buffer
      const phEst = -Math.log10(Ka1) + Math.log10(nB_added / (eq1 - nB_added));
      initialGuess = Math.pow(10, -phEst);
    } else if (Math.abs(nB_added - eq1) < 1e-7) {
      // First equivalence point (amphiprotic intermediate HA^2- or H2A^-)
      initialGuess = Math.sqrt(Ka1 * Ka2);
    } else if (nB_added < eq2) {
      // Stage 2 buffer
      const phEst = -Math.log10(Ka2) + Math.log10((nB_added - eq1) / (eq2 - nB_added));
      initialGuess = Math.pow(10, -phEst);
    } else if (Math.abs(nB_added - eq2) < 1e-7) {
      // Second equivalence point
      initialGuess = Ka3 > 0 ? Math.sqrt(Ka2 * Ka3) : Math.sqrt(Ka2 * 1e-14);
    } else if (Ka3 > 0 && nB_added < eq3) {
      // Stage 3 buffer
      const phEst = -Math.log10(Ka3) + Math.log10((nB_added - eq2) / (eq3 - nB_added));
      initialGuess = Math.pow(10, -phEst);
    } else {
      // Excess strong base
      const excessRatio = Ka3 > 0 ? (nB_added - eq3) : (nB_added - eq2);
      const excessOH = excessRatio / Vtot;
      initialGuess = Kw / (excessOH > 0 ? excessOH : 1e-7);
    }

    h = solveChargeBalance(f, df, initialGuess, 1e-15, 10.0);
    oh = Kw / h;
    ph = -Math.log10(h);

    // Calculate species fractions
    const D_denom = h * h * h + Ka1 * h * h + Ka1 * Ka2 * h + Ka1 * Ka2 * Ka3;
    const alpha0 = (h * h * h) / D_denom;
    const alpha1 = (Ka1 * h * h) / D_denom;
    const alpha2 = (Ka1 * Ka2 * h) / D_denom;
    const alpha3 = (Ka1 * Ka2 * Ka3) / D_denom;
    speciesFractions = Ka3 > 0 ? [alpha0, alpha1, alpha2, alpha3] : [alpha0, alpha1, alpha2];

    // Build specific educational descriptions for multi-proton steps
    if (nB_added < eq1) {
      excess = "analyte";
      explanation = `De-protonation Stage 1. Hydroxide ion deprotonates ${analyte.formula} to form monovalent ${analyte.formula.substring(1)}⁻. Currently in the first buffer region (pKa₁ = ${(-Math.log10(Ka1)).toFixed(2)}).`;
      arabicExplanation = `مرحلة نزع البروتون الأولى. ينزع أيون الهيدروكسيد بروتونًا من الحمض لإنتاج الأنيون أحادي الشحنة. منطقة التثبيت الأولى (pKa₁ = ${(-Math.log10(Ka1)).toFixed(2)}).`;
    } else if (Math.abs(nB_added - eq1) < eq1 * 0.05) {
      excess = "analyte";
      explanation = `First Equivalence Point. Major species is amphiprotic (can act as both acid and base). The pH is determined approximately by pH ≈ 0.5 * (pKa₁ + pKa₂).`;
      arabicExplanation = `نقطة التكافؤ الأولى. الأيون السائد ذو طبيعة مترددة (يسلك كحمض وقاعدة). الأس الهيدروجيني يعادل تقريبًا نصف مجموع pKa₁ و pKa₂.`;
    } else if (nB_added < eq2) {
      excess = "analyte";
      explanation = `De-protonation Stage 2. Second proton is neutralised to form divalent species. Currently in the second buffer region (pKa₂ = ${(-Math.log10(Ka2)).toFixed(2)}).`;
      arabicExplanation = `مرحلة نزع البروتون الثانية. يتم تعادل البروتون الثاني لإنتاج الأنيون ثنائي الشحنة. منطقة التثبيت الثانية (pKa₂ = ${(-Math.log10(Ka2)).toFixed(2)}).`;
    } else if (Ka3 > 0 && Math.abs(nB_added - eq2) < eq1 * 0.05) {
      excess = "analyte";
      explanation = `Second Equivalence Point. All second protons are neutralized. Major species is divalent. pH ≈ 0.5 * (pKa₂ + pKa₃).`;
      arabicExplanation = `نقطة التكافؤ الثانية. تم تعادل كل البروتونات الثانية. الأيون السائد ثنائي الشحنة.`;
    } else if (Ka3 > 0 && nB_added < eq3) {
      excess = "analyte";
      explanation = `De-protonation Stage 3. Neutralizing the final weak proton. Buffer region around pKa₃ = ${(-Math.log10(Ka3)).toFixed(2)}.`;
      arabicExplanation = `مرحلة نزع البروتون الثالثة. تعادل البروتون الأخير الضعيف جدًا.`;
    } else {
      excess = "titrant";
      explanation = `Post-equivalence excess. Fully de-protonated species coexist with excess unneutralized NaOH which drives the pH.`;
      arabicExplanation = `مرحلة ما بعد التكافؤ. تتوفر القاعدة القوية NaOH بوفرة وتتحكم بالأس الهيدروجيني بالكامل.`;
    }

    formulas = [
      "[H^+] + [Na^+] = [OH^-] + C_{A, \\text{total}} \\cdot (\\alpha_1 + 2\\alpha_2 + 3\\alpha_3)",
      "\\alpha_i = \\text{Fraction of conjugate anion } i"
    ];

    // Conductivity: ions are Na+ (C_Na_added), OH- (oh), H+ (h), Acid anions with different charges
    const concMonovalent = alpha1 * C_A_tot;
    const concDivalent = alpha2 * C_A_tot;
    const concTrivalent = alpha3 * C_A_tot;
    conductivity = (h * LAMBDA_H + oh * LAMBDA_OH + C_Na_added * LAMBDA_NA + 
                     concMonovalent * LAMBDA_GENERAL_ANION + 
                     concDivalent * 2 * LAMBDA_GENERAL_ANION * 2 + // 2 for divalent multiplier (charge squared increases conductivity)
                     concTrivalent * 3 * LAMBDA_GENERAL_ANION * 3) * 1000;

    bufferCapacity = 2.303 * (h + oh + C_A_tot * (alpha1 + 4 * alpha2 + 9 * alpha3 - Math.pow(alpha1 + 2 * alpha2 + 3 * alpha3, 2)));
  }

  // ----------------------------------------------------
  // CASE 5: Weak Acid + Weak Base (e.g. CH3COOH + NH3)
  // ----------------------------------------------------
  else if (isAnalyteAcid && !analyte.isStrong && !titrant.isStrong) {
    const Ka_A = analyte.Ka ? analyte.Ka[0] : 1.8e-5;
    const Kb_B = titrant.Kb ? titrant.Kb : 1.8e-5;
    const Ka_B_conj = Kw / Kb_B; // Conjugate acid of base B

    const nA_tot = molesAnalyteInitial;
    const nB_added = molesTitrantAdded;
    const C_A_tot = nA_tot / Vtot;
    const C_B_tot = nB_added / Vtot;

    // Charge balance: [H+] + [BH+] = [OH-] + [A-]
    // x + C_B_tot * x / (x + Ka_B_conj) - Kw/x - C_A_tot * Ka_A / (x + Ka_A) = 0
    const f = (x: number) => x + (C_B_tot * x) / (x + Ka_B_conj) - Kw / x - (C_A_tot * Ka_A) / (x + Ka_A);
    const df = (x: number) => 1 + (C_B_tot * Ka_B_conj) / ((x + Ka_B_conj) * (x + Ka_B_conj)) + Kw / (x * x) + (C_A_tot * Ka_A) / ((x + Ka_A) * (x + Ka_A));

    const phNeutral = 7.0;
    h = solveChargeBalance(f, df, Math.pow(10, -phNeutral), 1e-15, 10.0);
    oh = Kw / h;
    ph = -Math.log10(h);

    const alphaA_minus = Ka_A / (h + Ka_A);
    const alphaHA = h / (h + Ka_A);
    speciesFractions = [alphaHA, alphaA_minus];

    const molDiff = Math.abs(nA_tot - nB_added);
    if (molDiff < 1e-7) {
      excess = "equivalence";
      explanation = `Equivalence Point. The solution contains ammonium acetate (NH₄⁺CH₃COO⁻). Since both parent species are weak (same strength here), the pH is neutral (pH ≈ 7.00). This curve is very flat.`;
      arabicExplanation = `نقطة التكافؤ. يحتوي المحلول على أسيتات الأمونيوم. نظرًا لأن الحمض والقاعدة ضعيفان ولهما نفس القوة، فإن الأس الهيدروجيني يكون متعادلاً تقريبًا.`;
    } else if (nA_tot > nB_added) {
      excess = "analyte";
      explanation = `Weak acid excess being titrated by a weak base. The buffer consists of CH₃COOH/CH₃COO⁻, but the titration transition is very gentle and lacks a sharp pH jump.`;
      arabicExplanation = `فائض من الحمض الضعيف يتم معايرته بقاعدة ضعيفة. يتكون المحلول المنظم من الأسيتيك وأنيونه، ولكن المنحنى لطيف ولا يملك قفزة حادة.`;
    } else {
      excess = "titrant";
      explanation = `Post-equivalence. The solution has excess weak ammonia base which sets a basic ceiling of pH ≈ 9 to 10.`;
      arabicExplanation = `ما بعد التكافؤ. يحتوي المحلول على فائض من الأمونيا الضعيفة والتي تضع حدًا قاعديًا أقصى في حدود 9 إلى 10.`;
    }

    formulas = [
      "[H^+] + [BH^+] = [OH^-] + [A^-]",
      "[A^-] = C_{A, \\text{total}} \\cdot \\frac{K_{a,A}}{[H^+] + K_{a,A}}",
      "[BH^+] = C_{B, \\text{total}} \\cdot \\frac{[H^+]}{[H^+] + K_{a,\\text{conjugate}}}"
    ];

    // Conductivity: NH4+ is alphaBH_plus * C_B_tot, CH3COO- is alphaA_minus * C_A_tot, H+, OH-
    const alphaBH_plus = h / (h + Ka_B_conj);
    const concAmmonium = alphaBH_plus * C_B_tot;
    const concAcetate = alphaA_minus * C_A_tot;
    conductivity = (h * LAMBDA_H + oh * LAMBDA_OH + concAmmonium * LAMBDA_NH4 + concAcetate * LAMBDA_CH3COO) * 1000;
    bufferCapacity = 2.303 * (h + oh + (C_A_tot * Ka_A * h) / ((h + Ka_A) * (h + Ka_A)) + (C_B_tot * Ka_B_conj * h) / ((h + Ka_B_conj) * (h + Ka_B_conj)));
  }

  // ----------------------------------------------------
  // CASE 6: Strong Base + Strong Acid (Reverse SB + SA)
  // ----------------------------------------------------
  else {
    // Treat as strong base in analyte being titrated by strong acid
    const nB = molesAnalyteInitial;
    const nA = molesTitrantAdded;
    const diff = nB - nA;
    const D = diff / Vtot; // Net excess strong species concentration (positive means excess base)

    // Solve [H]^2 + D*[H] - Kw = 0 exactly
    h = (-D + Math.sqrt(D * D + 4 * Kw)) / 2;
    oh = Kw / h;
    ph = -Math.log10(h);

    const molDiff = Math.abs(nA - nB);
    if (molDiff < 1e-7) {
      excess = "equivalence";
      explanation = "Equivalence point of strong base titrated with strong acid. pH is neutral.";
      arabicExplanation = "نقطة التكافؤ لمعايرة قاعدة قوية بحمض قوي. الأس الهيدروجيني متعادل.";
    } else if (nB > nA) {
      excess = "analyte";
      explanation = "Excess strong base in solution. Major ions are Na⁺ and OH⁻.";
      arabicExplanation = "فائض من القاعدة القوية في المحلول. الأيونات السائدة هي Na⁺ و OH⁻.";
    } else {
      excess = "titrant";
      explanation = "Post-equivalence. Excess strong acid (HCl) drives the pH down.";
      arabicExplanation = "ما بعد التكافؤ. حمض الهيدروكلوريك القوي الزائد يخفض الأس الهيدروجيني.";
    }

    formulas = [
      "[H^+]^2 + D \\cdot [H^+] - K_w = 0"
    ];

    const concCl_tot = (nA) / Vtot;
    const concNa_tot = (nB) / Vtot;
    conductivity = (h * LAMBDA_H + oh * LAMBDA_OH + concNa_tot * LAMBDA_NA + concCl_tot * LAMBDA_CL) * 1000;
    bufferCapacity = 2.303 * (h + oh);
    speciesFractions = [1.0];
  }

  // Remaining moles calculation
  const molesRemaining = Math.max(0, molesAnalyteInitial - molesTitrantAdded);

  // Return formatted results
  return {
    ph,
    h,
    oh,
    speciesFractions,
    conductivity,
    bufferCapacity: isNaN(bufferCapacity) || !isFinite(bufferCapacity) ? 0 : bufferCapacity,
    molesAnalyteRemaining: molesRemaining,
    molesTitrantAdded,
    excess,
    explanation,
    arabicExplanation,
    formulas
  };
}

// Generate the entire array of titration steps up to a limit volume (e.g., 100 mL)
export function generateTitrationCurve(
  analyte: Chemical,
  titrant: Chemical,
  temp: number,
  maxVolume = 100,
  stepSize = 0.5,
  indicatorName: string
): TitrationStepResult[] {
  const steps: TitrationStepResult[] = [];
  
  // Calculate first step with 0 mL added
  let prevRes = calculateTitrationPoint(0, analyte, titrant, temp);
  
  for (let vol = 0; vol <= maxVolume; vol = parseFloat((vol + stepSize).toFixed(3))) {
    const res = calculateTitrationPoint(vol, analyte, titrant, temp);
    
    // We compute dpH/dV (derivative of pH with respect to Volume)
    let dpH_dV = 0;
    if (steps.length > 0) {
      const prevStep = steps[steps.length - 1];
      const dV = vol - prevStep.volumeAdded;
      if (dV > 0) {
        dpH_dV = (res.ph - prevStep.ph) / dV;
      }
    }

    steps.push({
      volumeAdded: vol,
      totalVolume: analyte.initialVolume + vol,
      ph: res.ph,
      poh: 14 - res.ph,
      hConcentration: res.h,
      ohConcentration: res.oh,
      molesAnalyteRemaining: res.molesAnalyteRemaining,
      molesTitrantAdded: res.molesTitrantAdded,
      excessReagent: res.excess,
      conductivity: res.conductivity,
      bufferCapacity: res.bufferCapacity,
      dpH_dV: dpH_dV,
      speciesFractions: res.speciesFractions,
      indicatorColor: getIndicatorColor(res.ph, indicatorName),
      explanationStep: res.explanation,
      formulasUsed: res.formulas
    });
  }

  // Smooth the first derivative dpH/dV since numerical steps can introduce minor noise
  for (let i = 1; i < steps.length - 1; i++) {
    if (steps[i].volumeAdded > 0) {
      steps[i].dpH_dV = (steps[i-1].dpH_dV + steps[i].dpH_dV + steps[i+1].dpH_dV) / 3;
    }
  }

  return steps;
}
