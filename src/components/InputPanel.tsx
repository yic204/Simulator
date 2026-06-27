/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Chemical } from "../types";
import { PRESETS } from "../mathEngine";
import { 
  Atom, 
  Settings, 
  HelpCircle, 
  Thermometer, 
  Scale, 
  Zap,
  Info
} from "lucide-react";

interface InputPanelProps {
  analyte: Chemical;
  titrant: Chemical;
  selectedPresetId: string;
  selectedIndicatorName: string;
  temperature: number;
  dropVolume: number;
  burettePrecision: number;
  isArabic: boolean;
  onUpdateConfig: (config: {
    analyte: Chemical;
    titrant: Chemical;
    selectedPresetId: string;
    selectedIndicatorName: string;
    temperature: number;
    dropVolume: number;
    burettePrecision: number;
  }) => void;
  isSimulating: boolean;
}

const INDICATORS = [
  { name: "Phenolphthalein", minPh: 8.2, maxPh: 10.0, colorLow: "#ffffff", colorHigh: "#f43f5e" },
  { name: "Methyl Orange", minPh: 3.1, maxPh: 4.4, colorLow: "#ef4444", colorHigh: "#eab308" },
  { name: "Bromothymol Blue", minPh: 6.0, maxPh: 7.6, colorLow: "#eab308", colorHigh: "#2563eb" },
  { name: "Lithmus", minPh: 4.5, maxPh: 8.3, colorLow: "#ef4444", colorHigh: "#3b82f6" },
  { name: "Thymol Blue", minPh: 1.2, maxPh: 2.8, colorLow: "#ef4444", colorHigh: "#eab308" },
];

export const InputPanel: React.FC<InputPanelProps> = ({
  analyte,
  titrant,
  selectedPresetId,
  selectedIndicatorName,
  temperature,
  dropVolume,
  burettePrecision,
  isArabic,
  onUpdateConfig,
  isSimulating,
}) => {
  const [activeTab, setActiveTab] = useState<"presets" | "chemical" | "instrument">("presets");

  // State local shadows
  const [presetId, setPresetId] = useState(selectedPresetId);
  const [indicatorName, setIndicatorName] = useState(selectedIndicatorName);
  const [tempVal, setTempVal] = useState(temperature);
  const [dropVol, setDropVol] = useState(dropVolume);
  const [precision, setPrecision] = useState(burettePrecision);

  // Custom chemical construction states
  const [analyteName, setAnalyteName] = useState(analyte.name);
  const [analyteFormula, setAnalyteFormula] = useState(analyte.formula);
  const [analyteIsAcid, setAnalyteIsAcid] = useState(analyte.isAcid);
  const [analyteIsStrong, setAnalyteIsStrong] = useState(analyte.isStrong);
  const [analyteConc, setAnalyteConc] = useState(analyte.initialConcentration);
  const [analyteVol, setAnalyteVol] = useState(analyte.initialVolume);
  const [analytePurity, setAnalytePurity] = useState(100.0);

  const [ka1, setKa1] = useState(analyte.Ka ? (analyte.Ka[0]?.toString() || "1.8e-5") : "1.8e-5");
  const [ka2, setKa2] = useState(analyte.Ka && analyte.Ka[1] ? analyte.Ka[1].toString() : "0");
  const [ka3, setKa3] = useState(analyte.Ka && analyte.Ka[2] ? analyte.Ka[2].toString() : "0");
  const [kb, setKb] = useState(analyte.Kb ? analyte.Kb.toString() : "1.8e-5");

  const [titrantName, setTitrantName] = useState(titrant.name);
  const [titrantFormula, setTitrantFormula] = useState(titrant.formula);
  const [titrantConc, setTitrantConc] = useState(titrant.initialConcentration);

  // Sync state if presets are updated from parent
  useEffect(() => {
    setPresetId(selectedPresetId);
    if (selectedPresetId !== "custom") {
      const pr = PRESETS.find((p) => p.id === selectedPresetId);
      if (pr) {
        setAnalyteName(pr.analyte.name);
        setAnalyteFormula(pr.analyte.formula);
        setAnalyteIsAcid(pr.analyte.isAcid);
        setAnalyteIsStrong(pr.analyte.isStrong);
        setAnalyteConc(pr.analyte.concentration);
        setAnalyteVol(pr.analyte.initialVolume);
        
        setKa1(pr.analyte.Ka ? (pr.analyte.Ka[0]?.toString() || "0") : "0");
        setKa2(pr.analyte.Ka && pr.analyte.Ka[1] ? pr.analyte.Ka[1].toString() : "0");
        setKa3(pr.analyte.Ka && pr.analyte.Ka[2] ? pr.analyte.Ka[2].toString() : "0");
        setKb(pr.analyte.Kb ? pr.analyte.Kb.toString() : "0");

        setTitrantName(pr.titrant.name);
        setTitrantFormula(pr.titrant.formula);
        setTitrantConc(pr.titrant.concentration);
      }
    }
  }, [selectedPresetId]);

  // Handle Preset Selection
  const handlePresetChange = (id: string) => {
    setPresetId(id);
    if (id !== "custom") {
      const pr = PRESETS.find((p) => p.id === id);
      if (pr) {
        onUpdateConfig({
          analyte: pr.analyte,
          titrant: pr.titrant,
          selectedPresetId: id,
          selectedIndicatorName: pr.recommendedIndicator,
          temperature: tempVal,
          dropVolume: dropVol,
          burettePrecision: precision,
        });
        setIndicatorName(pr.recommendedIndicator);
      }
    }
  };

  const parseSci = (v: string): number => {
    const p = parseFloat(v);
    return isNaN(p) ? 0 : p;
  };

  // Convert raw scientific strings into displayable pKa strings
  const getPValue = (v: string): string => {
    const val = parseSci(v);
    if (val <= 0) return "0";
    return (-Math.log10(val)).toFixed(2);
  };

  // Apply Changes for Custom inputs
  const handleApplyChanges = () => {
    const kas: number[] = [];
    if (ka1 && parseSci(ka1) > 0) kas.push(parseSci(ka1));
    if (ka2 && parseSci(ka2) > 0) kas.push(parseSci(ka2));
    if (ka3 && parseSci(ka3) > 0) kas.push(parseSci(ka3));

    const finalAnalyte: Chemical = {
      name: analyteName,
      formula: analyteFormula,
      isAcid: analyteIsAcid,
      isStrong: analyteIsStrong,
      concentration: analyteConc * (analytePurity / 100),
      initialVolume: analyteVol,
      Ka: kas.length > 0 ? kas : undefined,
      Kb: !analyteIsStrong && !analyteIsAcid ? parseSci(kb) : undefined,
    };

    const finalTitrant: Chemical = {
      name: titrantName,
      formula: titrantFormula,
      isAcid: !analyteIsAcid, // titrant is opposite
      isStrong: true, // all standardized titrants in general practice are strong
      concentration: titrantConc,
      initialVolume: 100, // unlimited capacity
    };

    onUpdateConfig({
      analyte: finalAnalyte,
      titrant: finalTitrant,
      selectedPresetId: "custom",
      selectedIndicatorName: indicatorName,
      temperature: tempVal,
      dropVolume: dropVol,
      burettePrecision: precision,
    });
    setPresetId("custom");
  };

  // UI translations
  const t = {
    title: isArabic ? "إعدادات تفاعل المعايرة" : "Chemical Configuration",
    tabPresets: isArabic ? "النماذج الجاهزة" : "Presets",
    tabChemical: isArabic ? "تخصيص الكيماويات" : "Custom Chemicals",
    tabInstrument: isArabic ? "الأجهزة والظروف" : "Instruments",
    presetSelectLabel: isArabic ? "اختر نظام المعايرة الجاهز:" : "Select Titration System Preset:",
    analyteSec: isArabic ? "المادة المجهولة (في الدورق)" : "Analyte (In Conical Flask)",
    titrantSec: isArabic ? "المادة المعلومة (في السحاحة)" : "Titrant (In Burette)",
    chemName: isArabic ? "اسم المركب:" : "Name:",
    chemFormula: isArabic ? "الصيغة الكيميائية:" : "Chemical Formula:",
    chemIsAcid: isArabic ? "حمض" : "Acid",
    chemIsBase: isArabic ? "قاعدة" : "Base",
    chemIsStrong: isArabic ? "قوي" : "Strong",
    chemIsWeak: isArabic ? "ضعيف" : "Weak",
    chemConc: isArabic ? "التركيز (مولار):" : "Concentration (M):",
    chemVol: isArabic ? "الحجم (مل):" : "Volume (mL):",
    chemPurity: isArabic ? "النقاء (%):" : "Purity (%):",
    applyBtn: isArabic ? "تطبيق الإعدادات المخصصة" : "Apply Custom Parameters",
    tempLabel: isArabic ? "درجة حرارة المحلول:" : "Solution Temp (°C):",
    indicatorSelect: isArabic ? "الكاشف اللوني المؤشر:" : "Chemical pH Indicator:",
    dropVolLabel: isArabic ? "حجم القطرة الواحدة (مل):" : "Volume per Drop (mL):",
    precisionLabel: isArabic ? "دقة التدرج للسحاحة (مل):" : "Burette Step Precision:",
  };

  return (
    <div className="bg-zinc-950/45 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] glass-layered-shadow p-7 flex flex-col gap-5 w-full">
      {/* Configuration Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Atom className="w-5 h-5 text-cyan-400" />
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest font-mono">
          {t.title}
        </h3>
      </div>

      {/* Selector Tabs */}
      <div className="flex bg-zinc-950/80 p-1.5 rounded-xl border border-white/5 gap-1.5">
        <button
          onClick={() => setActiveTab("presets")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === "presets"
              ? "bg-white/10 text-cyan-400 border border-white/10"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t.tabPresets}
        </button>
        <button
          onClick={() => setActiveTab("chemical")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === "chemical"
              ? "bg-white/10 text-cyan-400 border border-white/10"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t.tabChemical}
        </button>
        <button
          onClick={() => setActiveTab("instrument")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === "instrument"
              ? "bg-white/10 text-cyan-400 border border-white/10"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t.tabInstrument}
        </button>
      </div>

      {/* Tab Content: PRESETS */}
      {activeTab === "presets" && (
        <div className="flex flex-col gap-3.5">
          <label className="text-xs text-zinc-400 font-medium font-sans uppercase tracking-wider">
            {t.presetSelectLabel}
          </label>
          <div className="flex flex-col gap-2.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                disabled={isSimulating}
                onClick={() => handlePresetChange(preset.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 ${
                  presetId === preset.id
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white shadow-[0_4px_20px_rgba(6,182,212,0.1)]"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate">
                    {isArabic ? preset.arabicName : preset.name}
                  </span>
                  <span className="text-[10px] font-mono opacity-80 mt-1 truncate">
                    {preset.analyte.formula} vs {preset.titrant.formula}
                  </span>
                </div>
                <div className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase bg-zinc-950 border border-white/10">
                  {preset.analyte.isStrong ? "Strong" : "Weak"}
                </div>
              </button>
            ))}

            {/* Custom chemical options item */}
            <button
              disabled={isSimulating}
              onClick={() => handlePresetChange("custom")}
              className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 ${
                presetId === "custom"
                  ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                  : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold">
                  {isArabic ? "معايرة مخصصة (تعديل كامل)" : "Custom Formulation Lab"}
                </span>
                <span className="text-[10px] font-mono opacity-80 mt-1">
                  {isArabic ? "مستوى متقدم من الأبحاث كيميائية" : "Configure any multi-protic weak reaction"}
                </span>
              </div>
              <div className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase bg-zinc-950 border border-white/10 text-cyan-400">
                Custom
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Tab Content: CUSTOM CHEMICAL PARAMETERS */}
      {activeTab === "chemical" && (
        <div className="flex flex-col gap-5">
          
          {/* ANALYTE DETAILS */}
          <div className="border border-white/5 bg-zinc-950/20 p-4.5 rounded-2xl flex flex-col gap-3.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              {t.analyteSec}
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">{t.chemName}</label>
                <input
                  type="text"
                  disabled={isSimulating}
                  value={analyteName}
                  onChange={(e) => { setAnalyteName(e.target.value); setPresetId("custom"); }}
                  className="p-2.5 border border-white/10 bg-zinc-950 text-sm rounded-xl text-white font-medium focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">{t.chemFormula}</label>
                <input
                  type="text"
                  disabled={isSimulating}
                  value={analyteFormula}
                  onChange={(e) => { setAnalyteFormula(e.target.value); setPresetId("custom"); }}
                  className="p-2.5 border border-white/10 bg-zinc-950 text-sm rounded-xl font-mono text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">{isArabic ? "الصنف" : "Species Type"}</label>
                <div className="flex rounded-lg border border-white/10 p-0.5 bg-zinc-950">
                  <button
                    disabled={isSimulating}
                    onClick={() => { setAnalyteIsAcid(true); setPresetId("custom"); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      analyteIsAcid
                        ? "bg-white/10 text-cyan-400 font-mono"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t.chemIsAcid}
                  </button>
                  <button
                    disabled={isSimulating}
                    onClick={() => { setAnalyteIsAcid(false); setPresetId("custom"); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      !analyteIsAcid
                        ? "bg-white/10 text-cyan-400 font-mono"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t.chemIsBase}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">{isArabic ? "القوة" : "Strength"}</label>
                <div className="flex rounded-lg border border-white/10 p-0.5 bg-zinc-950">
                  <button
                    disabled={isSimulating}
                    onClick={() => { setAnalyteIsStrong(true); setPresetId("custom"); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      analyteIsStrong
                        ? "bg-white/10 text-cyan-400 font-mono"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t.chemIsStrong}
                  </button>
                  <button
                    disabled={isSimulating}
                    onClick={() => { setAnalyteIsStrong(false); setPresetId("custom"); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      !analyteIsStrong
                        ? "bg-white/10 text-cyan-400 font-mono"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t.chemIsWeak}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-400 font-sans leading-tight">{t.chemConc}</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={isSimulating}
                  value={analyteConc}
                  onChange={(e) => { setAnalyteConc(parseFloat(e.target.value) || 0); setPresetId("custom"); }}
                  className="p-2 border border-white/10 bg-zinc-950 text-sm rounded-lg text-white font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-400 font-sans leading-tight">{t.chemVol}</label>
                <input
                  type="number"
                  step="1"
                  disabled={isSimulating}
                  value={analyteVol}
                  onChange={(e) => { setAnalyteVol(parseFloat(e.target.value) || 0); setPresetId("custom"); }}
                  className="p-2 border border-white/10 bg-zinc-950 text-sm rounded-lg text-white font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-400 font-sans leading-tight">{t.chemPurity}</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  disabled={isSimulating}
                  value={analytePurity}
                  onChange={(e) => { setAnalytePurity(parseFloat(e.target.value) || 100); setPresetId("custom"); }}
                  className="p-2 border border-white/10 bg-zinc-950 text-sm rounded-lg text-white font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
            </div>

            {/* WEAK CONSTANTS: Ka / Kb fields */}
            {!analyteIsStrong && analyteIsAcid && (
              <div className="border-t border-white/5 pt-3 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                  {isArabic ? "ثوابت التفكك للحمض الضعيف" : "Acid Dissociation Constants"}
                </span>
                
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-1 bg-zinc-950 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500">K<sub>a1</sub></span>
                    <input
                      type="text"
                      disabled={isSimulating}
                      value={ka1}
                      onChange={(e) => { setKa1(e.target.value); setPresetId("custom"); }}
                      className="bg-transparent text-sm font-mono text-white w-full outline-none border-b border-transparent focus:border-cyan-500"
                    />
                    <div className="flex justify-between text-[9px] text-zinc-500 mt-1 font-mono">
                      <span>pK<sub>a1</sub>:</span>
                      <span className="font-bold text-cyan-400">{getPValue(ka1)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 bg-zinc-950 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500">K<sub>a2</sub></span>
                    <input
                      type="text"
                      disabled={isSimulating}
                      value={ka2}
                      onChange={(e) => { setKa2(e.target.value); setPresetId("custom"); }}
                      className="bg-transparent text-sm font-mono text-white w-full outline-none border-b border-transparent focus:border-cyan-500"
                    />
                    <div className="flex justify-between text-[9px] text-zinc-500 mt-1 font-mono">
                      <span>pK<sub>a2</sub>:</span>
                      <span className="font-bold text-cyan-400">{ka2 === "0" ? "None" : getPValue(ka2)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 bg-zinc-950 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500">K<sub>a3</sub></span>
                    <input
                      type="text"
                      disabled={isSimulating}
                      value={ka3}
                      onChange={(e) => { setKa3(e.target.value); setPresetId("custom"); }}
                      className="bg-transparent text-sm font-mono text-white w-full outline-none border-b border-transparent focus:border-cyan-500"
                    />
                    <div className="flex justify-between text-[9px] text-zinc-500 mt-1 font-mono">
                      <span>pK<sub>a3</sub>:</span>
                      <span className="font-bold text-cyan-400">{ka3 === "0" ? "None" : getPValue(ka3)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 text-[10px] text-cyan-400/80 bg-cyan-950/20 p-2.5 rounded-lg border border-cyan-500/10 mt-1.5 leading-normal">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{isArabic ? "ادخل بصيغة علمية مثل 1.8e-5. لبروتون أحادي، ضع الباقي 0." : "Enter in scientific notation like 1.8e-5. For monoprotic, set Ka2/Ka3 to 0."}</span>
                </div>
              </div>
            )}

            {!analyteIsStrong && !analyteIsAcid && (
              <div className="border-t border-white/5 pt-3 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                  {isArabic ? "ثابت التفكك للقاعدة الضعيفة" : "Base Dissociation Constant"}
                </span>

                <div className="flex flex-col gap-1 bg-zinc-950 p-2.5 rounded-lg border border-white/5 max-w-[140px]">
                  <span className="text-[10px] font-semibold text-zinc-500">K<sub>b</sub></span>
                  <input
                    type="text"
                    disabled={isSimulating}
                    value={kb}
                    onChange={(e) => { setKb(e.target.value); setPresetId("custom"); }}
                    className="bg-transparent text-sm font-mono text-white w-full outline-none border-b border-transparent focus:border-cyan-500"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500 mt-1 font-mono">
                    <span>pK<sub>b</sub>:</span>
                    <span className="font-bold text-cyan-400">{getPValue(kb)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TITRANT CONTAINER */}
          <div className="border border-white/5 bg-zinc-950/20 p-4.5 rounded-2xl flex flex-col gap-3.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
              {t.titrantSec}
            </span>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">{t.chemName}</label>
                <input
                  type="text"
                  disabled={isSimulating}
                  value={titrantName}
                  onChange={(e) => { setTitrantName(e.target.value); setPresetId("custom"); }}
                  className="p-2.5 border border-white/10 bg-zinc-950 text-sm rounded-xl text-white font-medium focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">{t.chemFormula}</label>
                <input
                  type="text"
                  disabled={isSimulating}
                  value={titrantFormula}
                  onChange={(e) => { setTitrantFormula(e.target.value); setPresetId("custom"); }}
                  className="p-2.5 border border-white/10 bg-zinc-950 text-sm rounded-xl font-mono text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">{t.chemConc}</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={isSimulating}
                  value={titrantConc}
                  onChange={(e) => { setTitrantConc(parseFloat(e.target.value) || 0); setPresetId("custom"); }}
                  className="p-2.5 border border-white/10 bg-zinc-950 text-sm rounded-xl text-white font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">{isArabic ? "نوع المعاير" : "Titrant Type"}</label>
                <div className="p-2.5 border border-white/10 bg-zinc-950/80 text-zinc-500 text-sm rounded-xl font-semibold text-center select-none">
                  {analyteIsAcid ? (isArabic ? "قوي (قاعدة)" : "Strong Base") : (isArabic ? "قوي (حمض)" : "Strong Acid")}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleApplyChanges}
            disabled={isSimulating}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-30 text-black font-bold py-3.5 px-4 rounded-xl text-sm shadow-lg border border-cyan-400/20 cursor-pointer transition-colors mt-1"
          >
            {t.applyBtn}
          </button>
        </div>
      )}

      {/* Tab Content: Instruments / physical constants */}
      {activeTab === "instrument" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Thermometer className="w-4 h-4 text-amber-500" />
                {t.tempLabel}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                disabled={isSimulating}
                value={tempVal}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 25;
                  setTempVal(val);
                  if (!isSimulating) {
                    onUpdateConfig({
                      analyte,
                      titrant,
                      selectedPresetId: presetId,
                      selectedIndicatorName: indicatorName,
                      temperature: val,
                      dropVolume: dropVol,
                      burettePrecision: precision,
                    });
                  }
                }}
                className="p-2.5 border border-white/10 bg-zinc-950 text-sm rounded-xl font-mono text-white outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Settings className="w-4 h-4 text-sky-500" />
                {t.indicatorSelect}
              </label>
              <select
                disabled={isSimulating}
                value={indicatorName}
                onChange={(e) => {
                  const ind = e.target.value;
                  setIndicatorName(ind);
                  onUpdateConfig({
                    analyte,
                    titrant,
                    selectedPresetId: presetId,
                    selectedIndicatorName: ind,
                    temperature: tempVal,
                    dropVolume: dropVol,
                    burettePrecision: precision,
                  });
                }}
                className="w-full text-sm border border-white/10 bg-zinc-950 text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                {INDICATORS.map((ind) => (
                  <option key={ind.name} value={ind.name} className="bg-zinc-950 text-white text-xs">
                    {ind.name} (pH {ind.minPh}-{ind.maxPh})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">
                {t.dropVolLabel}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.5"
                disabled={isSimulating}
                value={dropVol}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.05;
                  setDropVol(val);
                  if (!isSimulating) {
                    onUpdateConfig({
                      analyte,
                      titrant,
                      selectedPresetId: presetId,
                      selectedIndicatorName: indicatorName,
                      temperature: tempVal,
                      dropVolume: val,
                      burettePrecision: precision,
                    });
                  }
                }}
                className="p-2.5 border border-white/10 bg-zinc-950 text-sm rounded-xl font-mono text-white outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">
                {t.precisionLabel}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.001"
                max="1.0"
                disabled={isSimulating}
                value={precision}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.01;
                  setPrecision(val);
                  if (!isSimulating) {
                    onUpdateConfig({
                      analyte,
                      titrant,
                      selectedPresetId: presetId,
                      selectedIndicatorName: indicatorName,
                      temperature: tempVal,
                      dropVolume: dropVol,
                      burettePrecision: val,
                    });
                  }
                }}
                className="p-2.5 border border-white/10 bg-zinc-950 text-sm rounded-xl font-mono text-white outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
