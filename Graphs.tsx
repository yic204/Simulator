/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { TitrationStepResult, TitrationType } from "../types";
import { LineChart as ChartIcon, Sparkles, TrendingUp, HelpCircle } from "lucide-react";

interface GraphsProps {
  steps: TitrationStepResult[];
  currentVolumeAdded: number;
  titrationType: TitrationType;
  isArabic: boolean;
}

export const Graphs: React.FC<GraphsProps> = React.memo(({
  steps,
  currentVolumeAdded,
  titrationType,
  isArabic,
}) => {
  const [activeChart, setActiveChart] = useState<"ph" | "derivative" | "conductivity" | "buffer" | "distribution">("ph");

  // Find equivalence point to draw indicator lines
  // Equivalence point corresponds to the peak of the first derivative dpH/dV (or where dpH/dV is max)
  let maxDpH = 0;
  let equivalenceVolume = 0;
  let equivalencePh = 7;
  
  steps.forEach((s) => {
    if (s.volumeAdded > 0.1 && s.dpH_dV > maxDpH) {
      maxDpH = s.dpH_dV;
      equivalenceVolume = s.volumeAdded;
      equivalencePh = s.ph;
    }
  });

  // Keep a reasonable subset of data to avoid chart sluggishness
  // If we have 200 steps, we can plot them all, Recharts handles 200-500 points easily.
  const chartData = steps.map((s) => {
    const d: any = {
      volume: s.volumeAdded,
      ph: parseFloat(s.ph.toFixed(3)),
      dpH_dV: parseFloat(s.dpH_dV.toFixed(4)),
      conductivity: Math.round(s.conductivity),
      bufferCapacity: parseFloat(s.bufferCapacity.toFixed(4)),
    };

    // Species fractions mapping
    if (s.speciesFractions.length === 2) {
      d.HA = parseFloat((s.speciesFractions[0] * 100).toFixed(2));
      d.A_minus = parseFloat((s.speciesFractions[1] * 100).toFixed(2));
    } else if (s.speciesFractions.length === 3) {
      d.H2A = parseFloat((s.speciesFractions[0] * 100).toFixed(2));
      d.HA_minus = parseFloat((s.speciesFractions[1] * 100).toFixed(2));
      d.A_2minus = parseFloat((s.speciesFractions[2] * 100).toFixed(2));
    } else if (s.speciesFractions.length === 4) {
      d.H3A = parseFloat((s.speciesFractions[0] * 100).toFixed(2));
      d.H2A_minus = parseFloat((s.speciesFractions[1] * 100).toFixed(2));
      d.HA_2minus = parseFloat((s.speciesFractions[2] * 100).toFixed(2));
      d.A_3minus = parseFloat((s.speciesFractions[3] * 100).toFixed(2));
    } else {
      d.strongSpecies = 100;
    }

    return d;
  });

  // Custom tooltips for nice scientific reading
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 text-white p-3 border border-slate-800 rounded-xl font-mono text-xs shadow-xl flex flex-col gap-1.5 opacity-95">
          <p className="font-bold border-b border-slate-800 pb-1 text-slate-400">
            {isArabic ? `الحجم المضاف: ${label} مل` : `Added Vol: ${label} mL`}
          </p>
          {payload.map((p: any) => {
            let unit = "";
            if (p.name === "conductivity") unit = " µS/cm";
            if (p.name === "HA" || p.name === "A_minus" || p.name === "H2A" || p.name === "HA_minus" || p.name === "A_2minus" || p.name === "H3A" || p.name === "H2A_minus" || p.name === "HA_2minus" || p.name === "A_3minus") unit = "%";
            return (
              <p key={p.name} style={{ color: p.color }}>
                <span className="font-semibold uppercase tracking-wider">{p.name}:</span> {p.value}{unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const t = {
    phTab: isArabic ? "منحنى الـ pH" : "pH Curve",
    derivTab: isArabic ? "المشتق الأول dpH/dV" : "First Derivative",
    condTab: isArabic ? "الموصلية الكهربائية" : "Conductivity",
    bufferTab: isArabic ? "سعة المحلول المنظم" : "Buffer Capacity",
    speciesTab: isArabic ? "توزيع الفصائل الكيميائية" : "Species Distribution",
    volX: isArabic ? "الحجم المضاف من المعايِر (مل)" : "Volume of Titrant Added (mL)",
    phY: isArabic ? "الأس الهيدروجيني pH" : "pH Value",
    derivY: isArabic ? "معدل التغير dpH/dV" : "dpH/dV Rate",
    condY: isArabic ? "الموصلية (µS/cm)" : "Conductivity (µS/cm)",
    bufferY: isArabic ? "السعة المنظمة (β)" : "Buffer Capacity (β)",
    speciesY: isArabic ? "النسبة المئوية للفصائل (%)" : "Species Fraction (%)",
    currPoint: isArabic ? "النقطة الحالية" : "Current Point",
    eqPoint: isArabic ? "نقطة التكافؤ" : "Equivalence Point",
  };

  return (
    <div className="bg-zinc-950/45 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] glass-layered-shadow p-7 flex flex-col gap-6 w-full">
      {/* Chart selector tabs */}
      <div className="flex flex-wrap border-b border-white/5 pb-3 gap-2">
        <button
          onClick={() => setActiveChart("ph")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono border ${
            activeChart === "ph"
              ? "bg-cyan-500 text-black border-cyan-400"
              : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5"
          }`}
        >
          {t.phTab}
        </button>
        <button
          onClick={() => setActiveChart("derivative")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono border ${
            activeChart === "derivative"
              ? "bg-cyan-500 text-black border-cyan-400"
              : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5"
          }`}
        >
          {t.derivTab}
        </button>
        <button
          onClick={() => setActiveChart("conductivity")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono border ${
            activeChart === "conductivity"
              ? "bg-cyan-500 text-black border-cyan-400"
              : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5"
          }`}
        >
          {t.condTab}
        </button>
        {titrationType !== TitrationType.StrongAcid_StrongBase && (
          <button
            onClick={() => setActiveChart("buffer")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono border ${
              activeChart === "buffer"
                ? "bg-cyan-500 text-black border-cyan-400"
                : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5"
            }`}
          >
            {t.bufferTab}
          </button>
        )}
        {titrationType !== TitrationType.StrongAcid_StrongBase && (
          <button
            onClick={() => setActiveChart("distribution")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono border ${
              activeChart === "distribution"
                ? "bg-cyan-500 text-black border-cyan-400"
                : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5"
            }`}
          >
            {t.speciesTab}
          </button>
        )}
      </div>

      {/* Chart Stage */}
      <div className="w-full h-[420px] relative">
        <ResponsiveContainer width="100%" height="100%">
          {/* RENDER pH CHART */}
          {activeChart === "ph" ? (
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis dataKey="volume" label={{ value: t.volX, position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <YAxis domain={[0, 14]} ticks={[0, 2, 4, 6, 7, 8, 10, 12, 14]} label={{ value: t.phY, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <Tooltip content={<CustomTooltip />} />
              {/* Curve Line */}
              <Line type="monotone" dataKey="ph" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
              
              {/* Indicators */}
              <ReferenceLine x={currentVolumeAdded} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: t.currPoint, fill: "#ef4444", fontSize: 10, position: "top" }} />
              {equivalenceVolume > 0 && (
                <ReferenceLine x={equivalenceVolume} stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" label={{ value: `${t.eqPoint} (${equivalenceVolume.toFixed(2)}mL)`, fill: "#22c55e", fontSize: 10, position: "bottom" }} />
              )}
              {equivalenceVolume > 0 && (
                <ReferenceLine y={equivalencePh} stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" />
              )}
            </LineChart>
          ) : activeChart === "derivative" ? (
            /* RENDER DERIVATIVE CHART */
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis dataKey="volume" label={{ value: t.volX, position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <YAxis label={{ value: t.derivY, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="dpH_dV" stroke="#F43F5E" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
              <ReferenceLine x={currentVolumeAdded} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" />
              {equivalenceVolume > 0 && (
                <ReferenceLine x={equivalenceVolume} stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" label={{ value: `${t.eqPoint}`, fill: "#22c55e", fontSize: 10, position: "top" }} />
              )}
            </LineChart>
          ) : activeChart === "conductivity" ? (
            /* RENDER CONDUCTIVITY CHART */
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis dataKey="volume" label={{ value: t.volX, position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <YAxis label={{ value: t.condY, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="conductivity" stroke="#06b6d4" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
              <ReferenceLine x={currentVolumeAdded} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" />
              {equivalenceVolume > 0 && (
                <ReferenceLine x={equivalenceVolume} stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" />
              )}
            </LineChart>
          ) : activeChart === "buffer" ? (
            /* RENDER BUFFER CAPACITY CHART */
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis dataKey="volume" label={{ value: t.volX, position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <YAxis label={{ value: t.bufferY, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="bufferCapacity" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
              <ReferenceLine x={currentVolumeAdded} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" />
              {equivalenceVolume > 0 && (
                <ReferenceLine x={equivalenceVolume} stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" />
              )}
            </LineChart>
          ) : (
            /* RENDER SPECIES DISTRIBUTION DIAGRAM */
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis dataKey="volume" label={{ value: t.volX, position: "insideBottom", offset: -5, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <YAxis domain={[0, 100]} label={{ value: t.speciesY, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12, fill: "#a1a1aa" } }} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
              
              {/* Dynamic plotting lines depending on titration complexity */}
              {steps[0]?.speciesFractions.length === 2 && (
                <>
                  <Line type="monotone" dataKey="HA" stroke="#6366f1" strokeWidth={2} name="[HA] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="A_minus" stroke="#10b981" strokeWidth={2} name="[A⁻] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                </>
              )}
              {steps[0]?.speciesFractions.length === 3 && (
                <>
                  <Line type="monotone" dataKey="H2A" stroke="#6366f1" strokeWidth={2} name="[H₂A] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="HA_minus" stroke="#f59e0b" strokeWidth={2} name="[HA⁻] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="A_2minus" stroke="#10b981" strokeWidth={2} name="[A²⁻] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                </>
              )}
              {steps[0]?.speciesFractions.length === 4 && (
                <>
                  <Line type="monotone" dataKey="H3A" stroke="#6366f1" strokeWidth={2} name="[H₃A] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="H2A_minus" stroke="#3b82f6" strokeWidth={2} name="[H₂A⁻] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="HA_2minus" stroke="#f59e0b" strokeWidth={2} name="[HA²⁻] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="A_3minus" stroke="#10b981" strokeWidth={2} name="[A³⁻] %" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
                </>
              )}
              {steps[0]?.speciesFractions.length < 2 && (
                <Line type="monotone" dataKey="strongSpecies" stroke="#8b5cf6" strokeWidth={2} name="Strong Species" dot={false} isAnimationActive={true} animationDuration={450} animationEasing="ease-out" />
              )}
              
              <ReferenceLine x={currentVolumeAdded} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Dynamic Scientific Information Overlay */}
      <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-lg border border-zinc-100 dark:border-[#27272A] text-xs flex gap-2 items-start text-zinc-500 leading-relaxed">
        <Sparkles className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-zinc-700 dark:text-zinc-300 mr-1 flex items-center gap-1 font-mono">
            <TrendingUp className="w-3.5 h-3.5 text-[#3B82F6]" />
            {isArabic ? "قراءة التحليل البياني:" : "Scientific Graph Insight:"}
          </span>
          {activeChart === "ph" && (
            <span>
              {isArabic 
                ? "يمثل المنحنى التغير الأس هيدروجيني بالنسبة لحجم المادة المعايرة المضافة. الانعطاف العمودي الحاد يحدد بدقة نقطة التكافؤ الكيميائية." 
                : "The standard titration curve shows pH changes as titrant is added. The sharp vertical inflection represents the chemical equivalence point where moles of hydronium match hydroxide ions."}
            </span>
          )}
          {activeChart === "derivative" && (
            <span>
              {isArabic 
                ? "القمة الكبرى في هذا المنحنى تحدد النقطة التي يكون عندها معدل تغير الـ pH بالنسبة للحجم (dpH/dV) في أقصاه، وهو ما يعين نقطة التكافؤ بدقة ميكرومترية." 
                : "The first derivative mathematical curve plots dpH/dV. The absolute maximum peak identifies the precise mathematical equivalence point with perfect chemical resolution."}
            </span>
          )}
          {activeChart === "conductivity" && (
            <span>
              {isArabic 
                ? "تتغير الموصلية الكهربائية بشكل ملحوظ عند استبدال الأيونات سريعة الحركة (مثل H⁺ أو OH⁻) بأيونات الملح الأبطأ حركة (مثل Na⁺ أو Cl⁻)." 
                : "Conductivity tracking shows a sharp minimum near neutralisation because highly mobile ions like H⁺ (34.96) or OH⁻ (19.91) are replaced by slower salt ions like Na⁺ (5.01) and Cl⁻ (7.63)."}
            </span>
          )}
          {activeChart === "buffer" && (
            <span>
              {isArabic 
                ? "تصل سعة المحلول المنظم (β) إلى ذروتها القصوى عند نقطة نصف التكافؤ حيث يتساوى تركيز الحمض الضعيف وقاعدته المرافقة تمامًا (pH = pKa)." 
                : "The buffer capacity (β) plots the resistance to pH shifts. It reaches its global maximum at the half-equivalence point where [Weak Acid] = [Conjugate Base] (pH = pKa)."}
            </span>
          )}
          {activeChart === "distribution" && (
            <span>
              {isArabic 
                ? "يوضح هذا المخطط تغير النسب المئوية للمركبات الحمضية الضعيفة وتفككها المباشر إلى أنيونات مرافقة مع تقدم تفاعل التعادل." 
                : "The Species Distribution Diagram plots molecular fractions (α) of weak acids and their deprotonated conjugate base anions. Watch them transition dynamically during neutralization."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
