/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Chemical, TitrationStepResult } from "../types";
import { BookOpen, AlertCircle, Info, Hash, Sparkles } from "lucide-react";
import { getKw } from "../mathEngine";
import { MathRenderer } from "./MathRenderer";
import { AnimatedNumber } from "./AnimatedNumber";
import { motion } from "motion/react";

const isFormulaRelated = (formula: string, principle: string | null): boolean => {
  if (!principle) return false;
  const f = formula.toLowerCase();
  switch (principle) {
    case "neutralization":
      return (
        f.includes("neutralization") ||
        f.includes("react") ||
        f.includes("moles acid") ||
        f.includes("moles base") ||
        f.includes("hcl") ||
        f.includes("naoh") ||
        f.includes("[na^+]") ||
        f.includes("[cl^-]") ||
        f.includes("d =") ||
        f.includes("h_2o") ||
        f.includes("charge balance")
      );
    case "dissociation":
      return (
        f.includes("dissociation") ||
        f.includes("[a^-]") ||
        f.includes("[bh^+]") ||
        f.includes("ha") ||
        f.includes("alpha") ||
        f.includes("\\alpha") ||
        f.includes("fraction of conjugate")
      );
    case "ka":
      return (
        f.includes("k_a") ||
        f.includes("k_b") ||
        f.includes("pka") ||
        f.includes("pk_a") ||
        f.includes("hasselbalch") ||
        f.includes("buffer region") ||
        f.includes("log")
      );
    case "ph":
      return (
        f.includes("ph =") ||
        f.includes("ph ") ||
        f.includes("[h^+]") ||
        f.includes("h_concentration")
      );
    case "poh":
      return (
        f.includes("poh =") ||
        f.includes("poh ") ||
        f.includes("[oh^-]") ||
        f.includes("oh_concentration")
      );
    case "kw":
      return (
        f.includes("k_w") ||
        f.includes("kw") ||
        f.includes("autoionization") ||
        f.includes("[h^+] \\cdot [oh^-]")
      );
    case "relationship":
      return (
        f.includes("ph + poh = 14") ||
        f.includes("relationship") ||
        f.includes("pkw") ||
        f.includes("pk_w")
      );
    default:
      return false;
  }
};

const getPrincipleName = (p: string | null, isArabic: boolean) => {
  if (!p) return "";
  switch (p) {
    case "neutralization":
      return isArabic ? "تفاعل التعادل التام" : "Neutralization Reaction";
    case "dissociation":
      return isArabic ? "تفكك الحمض الضعيف" : "Weak Acid Dissociation";
    case "ka":
      return isArabic ? "ثابت التفكك (Ka)" : "Dissociation Constant (Ka)";
    case "ph":
      return isArabic ? "الأس الهيدروجيني (pH)" : "pH Exponent";
    case "poh":
      return isArabic ? "الأس الهيدروكسيدي (pOH)" : "pOH Exponent";
    case "kw":
      return isArabic ? "التفكك الذاتي للماء (Kw)" : "Water Autoionization";
    case "relationship":
      return isArabic ? "العلاقة الكهرومائية الأساسية" : "Fundamental Relationship";
    default:
      return "";
  }
};

interface FormulaInspectorProps {
  step: TitrationStepResult;
  analyte: Chemical;
  titrant: Chemical;
  temperature: number;
  isArabic: boolean;
  activePrinciple: string | null;
}

export const FormulaInspector: React.FC<FormulaInspectorProps> = ({
  step,
  analyte,
  titrant,
  temperature,
  isArabic,
  activePrinciple,
}) => {
  const Kw = getKw(temperature);
  const pKw = -Math.log10(Kw);

  // Helper to format scientific numbers elegantly
  const formatSci = (num: number) => {
    if (num === 0) return "0";
    if (num >= 0.01 && num < 1000) return num.toFixed(3);
    return num.toExponential(3).replace("e", " × 10^");
  };

  // Determine the net reaction chemical equation in mhchem format
  const getReactionEquation = () => {
    const a = analyte.formula;
    const b = titrant.formula;
    
    if (a === "HCl" && b === "NaOH") {
      return "HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)";
    }
    if (a === "CH3COOH" && b === "NaOH") {
      return "CH3COOH(aq) + NaOH(aq) <=> CH3COO^-(aq) + H2O(l) + Na^+(aq)";
    }
    if (a === "NH3" && b === "HCl") {
      return "NH3(aq) + HCl(aq) <=> NH4^+(aq) + Cl^-(aq)";
    }
    if (a === "H3PO4" && b === "NaOH") {
      return "H3PO4(aq) + 3NaOH(aq) -> Na3PO4(aq) + 3H2O(l)";
    }
    if (a === "H2CO3" && b === "NaOH") {
      return "H2CO3(aq) + 2NaOH(aq) -> Na2CO3(aq) + 2H2O(l)";
    }

    if (analyte.isAcid) {
      if (analyte.isStrong) {
        return `${a}(aq) + ${b}(aq) -> H2O(l) + Na^+(aq) + Cl^-(aq)`;
      } else if (analyte.Ka && analyte.Ka.length > 1) {
        return `${a}(aq) + ${analyte.Ka.length}${b}(aq) -> ${analyte.Ka.length}H2O(l) + Na^+[Conjugate\\ Base]`;
      } else {
        return `${a}(aq) + ${b}(aq) <=> [Conjugate\\ Base]^-(aq) + H2O(l) + Na^+(aq)`;
      }
    } else {
      return `${a}(aq) + ${b}(aq) <=> [Conjugate\\ Acid]^+(aq) + Cl^-(aq) + H2O(l)`;
    }
  };

  const reactionEquation = getReactionEquation();

  const t = {
    title: isArabic ? "مفتش المعادلات والخطوات الكيميائية" : "Theory & Calculation Inspector",
    subtitle: isArabic ? "افحص التفاصيل النظرية والرياضية للخطوة الحالية" : "Inspect the exact thermodynamic models and equations applied at this step",
    reactionHeader: isArabic ? "معادلة التفاعل الإجمالية" : "Net Chemical Reaction",
    activeFormulaHeader: isArabic ? "المعادلة الكيميائية النشطة" : "Active Equilibrium Formula",
    thermoHeader: isArabic ? "الثوابت الديناميكية الحرارية" : "Thermodynamic Constants",
    calcStepsHeader: isArabic ? "خطوات الحساب التفصيلية" : "Step-by-Step Calculation Steps",
    tempLabel: isArabic ? "درجة الحرارة:" : "Temperature:",
    kwLabel: isArabic ? "ثابت التفكك للماء (Kw):" : "Water Dissociation Constant (Kw):",
    pkwLabel: isArabic ? "أس ثابت الماء (pKw):" : "Water Exponent (pKw):",
    phLabel: isArabic ? "الأس الهيدروجيني المحسوب (pH):" : "Calculated pH:",
    concsLabel: isArabic ? "التراكيز الجزيئية عند التوازن:" : "Equilibrium Molar Concentrations:",
  };

  return (
    <div className="bg-zinc-950/45 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] glass-layered-shadow p-6 sm:p-8 flex flex-col gap-4 w-full">
      
      {/* Title */}
      <div className="flex items-start gap-3 border-b border-white/5 pb-3">
        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-cyan-400">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider font-mono">
            {t.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 leading-normal">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Net Chemical Reaction Panel */}
      <div className={`transition-all duration-300 p-4 rounded-2xl flex flex-col gap-2 shadow-sm border ${
        activePrinciple === "neutralization"
          ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse"
          : "bg-zinc-950/50 border-white/5"
      }`}>
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            {t.reactionHeader}
          </span>
          {activePrinciple === "neutralization" && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-md"
            >
              <Sparkles className="w-2.5 h-2.5 animate-pulse" />
              {isArabic ? "تعادل" : "NEUTRALIZATION"}
            </motion.span>
          )}
        </div>
        <MathRenderer 
          ce={true} 
          block={true} 
          math={reactionEquation} 
          className={`text-base font-bold text-zinc-300 font-mono tracking-tight bg-zinc-950/80 border transition-colors ${
            activePrinciple === "neutralization" ? "border-emerald-500/30 text-emerald-400" : "border-white/5"
          }`} 
        />
      </div>

      {/* Thermodynamic Constants Panel */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className={`transition-all duration-300 p-3.5 rounded-2xl flex flex-col gap-1 shadow-sm border ${
          activePrinciple === "kw" || activePrinciple === "relationship"
            ? "border-pink-500/50 bg-pink-500/5 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
            : "bg-zinc-950/50 border-white/5"
        }`}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">{t.thermoHeader}</span>
            {(activePrinciple === "kw" || activePrinciple === "relationship") && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-0.5 text-[7px] font-bold text-pink-400 uppercase tracking-wider bg-pink-500/20 border border-pink-500/30 px-1 py-0.5 rounded-md"
              >
                {activePrinciple === "kw" ? "K_w" : "pK_w"}
              </motion.span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 text-xs font-mono text-zinc-500 mt-1.5">
            <div className="flex justify-between">
              <span>{t.tempLabel}</span>
              <span className="font-bold text-zinc-300">
                <AnimatedNumber value={temperature} precision={1} /> °C
              </span>
            </div>
            <div className="flex justify-between">
              <span>K<sub>w</sub>:</span>
              <span className={`font-bold transition-colors ${
                activePrinciple === "kw" ? "text-pink-400" : "text-cyan-400"
              }`}>{Kw.toExponential(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>pK<sub>w</sub>:</span>
              <span className={`font-bold transition-colors ${
                activePrinciple === "kw" || activePrinciple === "relationship" ? "text-pink-400 animate-pulse" : "text-cyan-400"
              }`}>
                <AnimatedNumber value={pKw} precision={2} />
              </span>
            </div>
          </div>
        </div>

        <div className={`transition-all duration-300 p-3.5 rounded-2xl flex flex-col gap-1 shadow-sm border ${
          activePrinciple === "ka"
            ? "border-amber-500/50 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            : "bg-zinc-950/50 border-white/5"
        }`}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              {isArabic ? "ثوابت التفكك للمحلل" : "Analyte Constants"}
            </span>
            {activePrinciple === "ka" && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-0.5 text-[7px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/20 border border-amber-500/30 px-1 py-0.5 rounded-md animate-pulse"
              >
                K_a
              </motion.span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 text-xs font-mono text-zinc-500 mt-1.5">
            {analyte.isStrong ? (
              <div className="text-xs text-emerald-400 font-bold p-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center leading-normal">
                {isArabic ? "تفكك كامل (قوي)" : "Fully Dissociated"}
              </div>
            ) : analyte.isAcid ? (
              <>
                <div className="flex justify-between">
                  <span>K<sub>a1</sub>:</span>
                  <span className={`font-bold transition-colors ${activePrinciple === "ka" ? "text-amber-300" : "text-amber-400"}`}>{analyte.Ka?.[0].toExponential(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>pK<sub>a1</sub>:</span>
                  <span className={`font-bold transition-colors ${activePrinciple === "ka" ? "text-amber-300 animate-pulse" : "text-amber-400"}`}>{(-Math.log10(analyte.Ka?.[0] || 1)).toFixed(2)}</span>
                </div>
                {analyte.Ka && analyte.Ka.length > 1 && (
                  <div className="flex justify-between text-[10px]">
                    <span>K<sub>a2</sub>:</span>
                    <span className="font-bold text-amber-500">{analyte.Ka?.[1].toExponential(2)}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>K<sub>b</sub>:</span>
                  <span className={`font-bold transition-colors ${activePrinciple === "ka" ? "text-amber-300" : "text-pink-400"}`}>{analyte.Kb?.toExponential(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>pK<sub>b</sub>:</span>
                  <span className={`font-bold transition-colors ${activePrinciple === "ka" ? "text-amber-300 animate-pulse" : "text-pink-400"}`}>{(-Math.log10(analyte.Kb || 1)).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Calculation Proof Steps */}
      <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
          <Hash className="w-3.5 h-3.5 text-cyan-400" />
          {t.calcStepsHeader}
        </span>

        {/* Formulated explanation */}
        <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-white/5 text-xs text-zinc-400 leading-relaxed flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="font-bold text-[10px] text-cyan-400 uppercase tracking-wider font-mono">
              {isArabic ? "تفسير الحالة الحالية:" : "Reaction Stage Proof:"}
            </span>
            <span className="bg-white/5 border border-white/10 text-cyan-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono">
              {step.excessReagent}
            </span>
          </div>
          <p className="leading-normal">{step.explanationStep}</p>
        </div>

        {/* Equations Used list */}
        <div className="flex flex-col gap-2 mt-1">
          <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase">{t.activeFormulaHeader}</span>
          <div className="flex flex-col gap-2">
            {step.formulasUsed.map((f, idx) => {
              const isRelated = isFormulaRelated(f, activePrinciple);
              return (
                <div key={idx} className="flex flex-col gap-1">
                  {isRelated && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1 bg-cyan-500/15 border border-cyan-500/20 px-2 py-0.5 rounded-lg self-start"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                      <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                        {getPrincipleName(activePrinciple, isArabic)}
                      </span>
                    </motion.div>
                  )}
                  <MathRenderer 
                    block={true} 
                    math={f} 
                    className={`text-cyan-400 text-sm bg-zinc-950 border transition-all duration-300 ${
                      isRelated 
                        ? "border-cyan-500/50 bg-cyan-950/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]" 
                        : "border-white/5"
                    }`} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Equilibrium Concentrations Table */}
      <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-2.5 shadow-sm">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">{t.concsLabel}</span>
        
        <div className="grid grid-cols-4 gap-2 text-center mt-1">
          <div className={`p-2 rounded-xl border transition-all duration-300 ${
            activePrinciple === "ph" || activePrinciple === "kw"
              ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              : "bg-zinc-950/80 border-white/5"
          }`}>
            <span className="text-[9px] text-zinc-500 font-mono font-bold">[H⁺]</span>
            <div className="text-xs font-bold font-mono text-cyan-400 mt-1 leading-none">{formatSci(step.hConcentration)}</div>
          </div>
          <div className={`p-2 rounded-xl border transition-all duration-300 ${
            activePrinciple === "poh" || activePrinciple === "kw"
              ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_12px_rgba(236,72,153,0.15)]"
              : "bg-zinc-950/80 border-white/5"
          }`}>
            <span className="text-[9px] text-zinc-500 font-mono font-bold">[OH⁻]</span>
            <div className="text-xs font-bold font-mono text-pink-400 mt-1 leading-none">{formatSci(step.ohConcentration)}</div>
          </div>
          <div className={`p-2 rounded-xl border transition-all duration-300 ${
            activePrinciple === "ph" || activePrinciple === "relationship"
              ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              : "bg-zinc-950/80 border-white/5"
          }`}>
            <span className="text-[9px] text-zinc-500 font-mono font-bold">pH</span>
            <div className="text-xs font-bold font-mono text-emerald-400 mt-1 leading-none">
              <AnimatedNumber value={step.ph} precision={2} />
            </div>
          </div>
          <div className={`p-2 rounded-xl border transition-all duration-300 ${
            activePrinciple === "poh" || activePrinciple === "relationship"
              ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              : "bg-zinc-950/80 border-white/5"
          }`}>
            <span className="text-[9px] text-zinc-500 font-mono font-bold">pOH</span>
            <div className="text-xs font-bold font-mono text-amber-400 mt-1 leading-none">
              <AnimatedNumber value={step.poh} precision={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Warning check on ionic strength */}
      <div className="text-[10px] text-zinc-500 italic flex items-start gap-1.5 mt-1.5 font-sans leading-normal">
        <AlertCircle className="w-4 h-4 text-zinc-600 flex-shrink-0" />
        <span>
          {isArabic 
            ? "تعتمد الحسابات أعلاه على التراكيز بدلاً من الفاعلية (Activity) لتسهيل الفهم الأكاديمي." 
            : "Calculations assume activity coefficients are equal to 1 (Concentration approximation) for standard university chemistry curricula."}
        </span>
      </div>

    </div>
  );
};
