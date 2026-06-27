/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MathRenderer } from "./MathRenderer";
import { BookOpen, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TheoryReferenceProps {
  isArabic: boolean;
  activePrinciple: string | null;
  onSelectPrinciple: (principle: string | null) => void;
}

export const TheoryReference: React.FC<TheoryReferenceProps> = ({ 
  isArabic, 
  activePrinciple, 
  onSelectPrinciple 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const t = {
    title: isArabic ? "دليل مراجع المعادلات" : "Thermodynamic Formula Guide",
    subtitle: isArabic 
      ? "تصفح القوانين والمعادلات الرياضية الأساسية للمعايرة" 
      : "Review the essential chemical and mathematical models of titration",
    toggleShow: isArabic ? "عرض الدليل" : "Show Formula Guide",
    toggleHide: isArabic ? "إخفاء الدليل" : "Hide Formula Guide",
    clickHint: isArabic 
      ? "💡 اضغط على مبدأ لتظليل معادلاته النشطة في المفتش المباشر" 
      : "💡 Click a principle to highlight its live equations in the inspector",
    eqNeutralization: isArabic ? "تفاعل التعادل التام (حمض وقاعدة):" : "Strong Acid-Base Neutralization Reaction:",
    eqDissociation: isArabic ? "تفكك الحمض الضعيف في الماء:" : "Weak Acid Dissociation Equilibrium:",
    eqKa: isArabic ? "ثابت تفكك الحمض (Ka):" : "Acid Dissociation Constant (Ka):",
    eqPh: isArabic ? "تعريف الأس الهيدروجيني (pH):" : "Definition of pH Exponent:",
    eqPoh: isArabic ? "تعريف الأس الهيدروكسيدي (pOH):" : "Definition of pOH Exponent:",
    eqKw: isArabic ? "التفكك الذاتي للماء (Kw):" : "Autoionization Constant of Water (Kw):",
    eqRelationship: isArabic ? "العلاقة الديناميكية الحرارية الأساسية:" : "Fundamental Thermodynamic Relationship:",
  };

  const handleToggle = (key: string) => {
    onSelectPrinciple(activePrinciple === key ? null : key);
  };

  return (
    <div className="bg-zinc-950/45 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] glass-layered-shadow p-6 sm:p-8 flex flex-col gap-3 w-full transition-all duration-300">
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer group select-none"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-amber-400 group-hover:bg-white/10 transition-colors">
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
        <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors pl-2">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="theory-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { type: "spring", stiffness: 220, damping: 28 },
                opacity: { duration: 0.18, ease: "easeOut" },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { type: "spring", stiffness: 220, damping: 28 },
                opacity: { duration: 0.12, ease: "easeIn" },
              },
            }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 mt-2 border-t border-white/5 pt-4">
              <span className="text-[10px] text-zinc-500 italic px-1 text-center block font-sans">
                {t.clickHint}
              </span>

              {/* Neutralization Reaction */}
              <div 
                onClick={() => handleToggle("neutralization")}
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] select-none relative group ${
                  activePrinciple === "neutralization" 
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.25)]" 
                    : "border-white/5 bg-zinc-950/40 hover:border-emerald-500/30 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {t.eqNeutralization}
                  </span>
                  {activePrinciple === "neutralization" && (
                    <span className="flex items-center gap-1 text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      {isArabic ? "نشط" : "ACTIVE"}
                    </span>
                  )}
                </div>
                <MathRenderer 
                  ce={true} 
                  block={true} 
                  math="HCl + NaOH \rightarrow NaCl + H2O" 
                  className={`text-emerald-400 text-sm bg-zinc-950 border transition-colors ${
                    activePrinciple === "neutralization" ? "border-emerald-500/30 bg-emerald-950/50" : "border-white/5"
                  }`} 
                />
              </div>

              {/* Weak Acid Dissociation */}
              <div 
                onClick={() => handleToggle("dissociation")}
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] select-none relative group ${
                  activePrinciple === "dissociation" 
                    ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                    : "border-white/5 bg-zinc-950/40 hover:border-cyan-500/30 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {t.eqDissociation}
                  </span>
                  {activePrinciple === "dissociation" && (
                    <span className="flex items-center gap-1 text-[8px] font-extrabold text-cyan-400 uppercase tracking-widest bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      {isArabic ? "نشط" : "ACTIVE"}
                    </span>
                  )}
                </div>
                <MathRenderer 
                  block={true} 
                  math="HA \rightleftharpoons H^+ + A^-" 
                  className={`text-cyan-400 text-sm bg-zinc-950 border transition-colors ${
                    activePrinciple === "dissociation" ? "border-cyan-500/30 bg-cyan-950/50" : "border-white/5"
                  }`} 
                />
              </div>

              {/* Acid Dissociation Constant */}
              <div 
                onClick={() => handleToggle("ka")}
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] select-none relative group ${
                  activePrinciple === "ka" 
                    ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.25)]" 
                    : "border-white/5 bg-zinc-950/40 hover:border-amber-500/30 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {t.eqKa}
                  </span>
                  {activePrinciple === "ka" && (
                    <span className="flex items-center gap-1 text-[8px] font-extrabold text-amber-400 uppercase tracking-widest bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      {isArabic ? "نشط" : "ACTIVE"}
                    </span>
                  )}
                </div>
                <MathRenderer 
                  block={true} 
                  math="K_a = \frac{[H^+][A^-]}{[HA]}" 
                  className={`text-amber-400 text-sm bg-zinc-950 border transition-colors ${
                    activePrinciple === "ka" ? "border-amber-500/30 bg-amber-950/50" : "border-white/5"
                  }`} 
                />
              </div>

              {/* pH Definition */}
              <div 
                onClick={() => handleToggle("ph")}
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] select-none relative group ${
                  activePrinciple === "ph" 
                    ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                    : "border-white/5 bg-zinc-950/40 hover:border-cyan-500/30 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {t.eqPh}
                  </span>
                  {activePrinciple === "ph" && (
                    <span className="flex items-center gap-1 text-[8px] font-extrabold text-cyan-400 uppercase tracking-widest bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      {isArabic ? "نشط" : "ACTIVE"}
                    </span>
                  )}
                </div>
                <MathRenderer 
                  block={true} 
                  math="pH = -\log[H^+]" 
                  className={`text-cyan-400 text-sm bg-zinc-950 border transition-colors ${
                    activePrinciple === "ph" ? "border-cyan-500/30 bg-cyan-950/50" : "border-white/5"
                  }`} 
                />
              </div>

              {/* pOH Definition */}
              <div 
                onClick={() => handleToggle("poh")}
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] select-none relative group ${
                  activePrinciple === "poh" 
                    ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.25)]" 
                    : "border-white/5 bg-zinc-950/40 hover:border-pink-500/30 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {t.eqPoh}
                  </span>
                  {activePrinciple === "poh" && (
                    <span className="flex items-center gap-1 text-[8px] font-extrabold text-pink-400 uppercase tracking-widest bg-pink-500/20 border border-pink-500/30 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      {isArabic ? "نشط" : "ACTIVE"}
                    </span>
                  )}
                </div>
                <MathRenderer 
                  block={true} 
                  math="pOH = -\log[OH^-]" 
                  className={`text-pink-400 text-sm bg-zinc-950 border transition-colors ${
                    activePrinciple === "poh" ? "border-pink-500/30 bg-pink-950/50" : "border-white/5"
                  }`} 
                />
              </div>

              {/* Water autoionization */}
              <div 
                onClick={() => handleToggle("kw")}
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] select-none relative group ${
                  activePrinciple === "kw" 
                    ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.25)]" 
                    : "border-white/5 bg-zinc-950/40 hover:border-pink-500/30 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {t.eqKw}
                  </span>
                  {activePrinciple === "kw" && (
                    <span className="flex items-center gap-1 text-[8px] font-extrabold text-pink-400 uppercase tracking-widest bg-pink-500/20 border border-pink-500/30 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      {isArabic ? "نشط" : "ACTIVE"}
                    </span>
                  )}
                </div>
                <MathRenderer 
                  block={true} 
                  math="K_w = [H^+][OH^-]" 
                  className={`text-pink-500 text-sm bg-zinc-950 border transition-colors ${
                    activePrinciple === "kw" ? "border-pink-500/30 bg-pink-950/50" : "border-white/5"
                  }`} 
                />
              </div>

              {/* Relationship */}
              <div 
                onClick={() => handleToggle("relationship")}
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] select-none relative group ${
                  activePrinciple === "relationship" 
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.25)]" 
                    : "border-white/5 bg-zinc-950/40 hover:border-emerald-500/30 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {t.eqRelationship}
                  </span>
                  {activePrinciple === "relationship" && (
                    <span className="flex items-center gap-1 text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      {isArabic ? "نشط" : "ACTIVE"}
                    </span>
                  )}
                </div>
                <MathRenderer 
                  block={true} 
                  math="pH + pOH = 14" 
                  className={`text-emerald-400 text-sm bg-zinc-950 border transition-colors ${
                    activePrinciple === "relationship" ? "border-emerald-500/30 bg-emerald-950/50" : "border-white/5"
                  }`} 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
