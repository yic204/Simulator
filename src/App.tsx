/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Chemical, TitrationType, SavedExperiment, TitrationStepResult } from "./types";
import { PRESETS, generateTitrationCurve, calculateTitrationPoint, getIndicatorColor } from "./mathEngine";
import { LabEquipment } from "./components/LabEquipment";
import { InputPanel } from "./components/InputPanel";
import { Graphs } from "./components/Graphs";
import { ResultsTable } from "./components/ResultsTable";
import { FormulaInspector } from "./components/FormulaInspector";
import { TheoryReference } from "./components/TheoryReference";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedNumber } from "./components/AnimatedNumber";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  Undo2, 
  Redo2, 
  Save, 
  FolderOpen, 
  Languages, 
  Maximize, 
  FlaskConical,
  Keyboard,
  Plus,
  Compass,
  FileCheck,
  BookOpen,
  Trash2
} from "lucide-react";

export default function App() {
  const [isArabic, setIsArabic] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Titration Config State
  const [activePrinciple, setActivePrinciple] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("hcl_naoh");
  const [selectedIndicatorName, setSelectedIndicatorName] = useState("Phenolphthalein");
  const [temperature, setTemperature] = useState(25.0);
  const [dropVolume, setDropVolume] = useState(0.05); // mL per drop
  const [burettePrecision, setBurettePrecision] = useState(0.01); // mL precision steps
  
  const [analyte, setAnalyte] = useState<Chemical>(PRESETS[0].analyte);
  const [titrant, setTitrant] = useState<Chemical>(PRESETS[0].titrant);

  // Active Simulation variables
  const [volumeAdded, setVolumeAdded] = useState(0.0); // mL added
  const [isSimulating, setIsSimulating] = useState(false);
  const [pourSpeed, setPourSpeed] = useState(1); // 1 = regular, 2 = fast, 3 = drop-by-drop
  const [stirrerSpeed, setStirrerSpeed] = useState(50); // 0 to 100

  // History for Undo/Redo
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [redoStack, setRedoStack] = useState<number[]>([]);

  // Saved experiments state
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([]);
  const [saveNameInput, setSaveNameInput] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Theoretical full curve pre-calculated
  const [fullCurveSteps, setFullCurveSteps] = useState<TitrationStepResult[]>([]);
  // Active incremental steps generated during simulation
  const [activeSteps, setActiveSteps] = useState<TitrationStepResult[]>([]);

  // Timer Ref for continuous simulation
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Floating particles in dark laboratory space
  const [particles] = useState(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      duration: Math.random() * 12 + 8,
      delay: Math.random() * 5
    }))
  );

  // Pre-calculate full theoretical curve whenever inputs change
  useEffect(() => {
    const maxVolume = 100; // mL max
    const stepSize = 0.1; // mL spacing for graph resolution
    const steps = generateTitrationCurve(
      analyte,
      titrant,
      temperature,
      maxVolume,
      stepSize,
      selectedIndicatorName
    );
    setFullCurveSteps(steps);
  }, [analyte, titrant, temperature, selectedIndicatorName]);

  // Sync active steps matching what the user has currently poured
  useEffect(() => {
    const currentSteps: TitrationStepResult[] = [];
    const stepSize = 0.1; // mL
    
    // Generate actual incremental measured steps
    for (let vol = 0; vol <= volumeAdded; vol = parseFloat((vol + stepSize).toFixed(3))) {
      const res = calculateTitrationPoint(vol, analyte, titrant, temperature);
      
      let dpH_dV = 0;
      if (currentSteps.length > 0) {
        const prevStep = currentSteps[currentSteps.length - 1];
        const dV = vol - prevStep.volumeAdded;
        if (dV > 0) {
          dpH_dV = (res.ph - prevStep.ph) / dV;
        }
      }

      currentSteps.push({
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
        indicatorColor: getIndicatorColor(res.ph, selectedIndicatorName),
        explanationStep: res.explanation,
        formulasUsed: res.formulas
      });
    }

    // Smooth first derivative
    for (let i = 1; i < currentSteps.length - 1; i++) {
      if (currentSteps[i].volumeAdded > 0) {
        currentSteps[i].dpH_dV = (currentSteps[i-1].dpH_dV + currentSteps[i].dpH_dV + currentSteps[i+1].dpH_dV) / 3;
      }
    }

    setActiveSteps(currentSteps);
  }, [volumeAdded, analyte, titrant, temperature, selectedIndicatorName]);

  // Load saved experiments from Local Storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("titration_experiments_saves");
    if (saved) {
      try {
        setSavedExperiments(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved experiments", e);
      }
    }
  }, []);

  // Add precise incremental volume (with undo history)
  const addVolume = useCallback((amount: number) => {
    setVolumeAdded((prev) => {
      const next = parseFloat(Math.min(100.0, Math.max(0.0, prev + amount)).toFixed(3));
      
      if (prev !== next) {
        setUndoStack((prevStack) => [...prevStack, prev]);
        setRedoStack([]); // Clear redo on new action
      }
      return next;
    });
  }, []);

  // Undo function
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousVolume = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, volumeAdded]);
    setVolumeAdded(previousVolume);
  }, [undoStack, volumeAdded]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextVolume = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, volumeAdded]);
    setVolumeAdded(nextVolume);
  }, [redoStack, volumeAdded]);

  // Unified queue-based droplet state
  const [triggerDropCount, setTriggerDropCount] = useState(0);

  const handleTriggerManualDrops = useCallback((count: number) => {
    setTriggerDropCount((prev) => prev + count);
  }, []);

  const handleBuretteDropComplete = useCallback(() => {
    setStirrerSpeed((prev) => {
      if (prev < 90) {
        setTimeout(() => setStirrerSpeed((current) => Math.max(10, current - 2)), 150);
        return Math.min(100, prev + 2);
      }
      return prev;
    });
  }, []);

  const handleUpdateConfig = useCallback((config: {
    analyte: Chemical;
    titrant: Chemical;
    selectedPresetId: string;
    selectedIndicatorName: string;
    temperature: number;
    dropVolume: number;
    burettePrecision: number;
  }) => {
    setAnalyte(config.analyte);
    setTitrant(config.titrant);
    setSelectedPresetId(config.selectedPresetId);
    setSelectedIndicatorName(config.selectedIndicatorName);
    setTemperature(config.temperature);
    setDropVolume(config.dropVolume);
    setBurettePrecision(config.burettePrecision);
    
    setVolumeAdded(0.0);
    setUndoStack([]);
    setRedoStack([]);
    setTriggerDropCount(0);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsSimulating((prev) => !prev);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleTriggerManualDrops(1);
      } else if (e.code === "Escape") {
        e.preventDefault();
        setVolumeAdded(0);
        setIsSimulating(false);
        setUndoStack([]);
        setRedoStack([]);
        setTriggerDropCount(0);
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTriggerManualDrops, handleUndo, handleRedo]);

  const handleSaveExperiment = () => {
    if (!saveNameInput.trim()) return;

    const newSave: SavedExperiment = {
      id: Date.now().toString(),
      name: saveNameInput,
      date: new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      state: {
        presetId: selectedPresetId,
        titrationType: analyte.isAcid 
          ? (analyte.isStrong ? TitrationType.StrongAcid_StrongBase : TitrationType.WeakAcid_StrongBase) 
          : TitrationType.StrongAcid_WeakBase,
        analyte: { ...analyte },
        titrant: { ...titrant },
        selectedIndicatorName,
        temperature,
        dropVolume,
        burettePrecision,
        volumeAdded,
      },
    };

    const updated = [newSave, ...savedExperiments];
    setSavedExperiments(updated);
    localStorage.setItem("titration_experiments_saves", JSON.stringify(updated));
    setSaveNameInput("");
    setShowSaveModal(false);
  };

  const handleLoadExperiment = (save: SavedExperiment) => {
    const state = save.state;
    setAnalyte(state.analyte);
    setTitrant(state.titrant);
    setSelectedPresetId(state.presetId);
    setSelectedIndicatorName(state.selectedIndicatorName);
    setTemperature(state.temperature);
    setDropVolume(state.dropVolume);
    setBurettePrecision(state.burettePrecision);
    setVolumeAdded(state.volumeAdded);

    setUndoStack([]);
    setRedoStack([]);
    setIsSimulating(false);
  };

  const handleDeleteExperiment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedExperiments.filter((exp) => exp.id !== id);
    setSavedExperiments(updated);
    localStorage.setItem("titration_experiments_saves", JSON.stringify(updated));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const currentStep = activeSteps[activeSteps.length - 1] || {
    ph: 7,
    conductivity: 0,
    indicatorColor: "#ffffff",
    hConcentration: 1e-7,
    ohConcentration: 1e-7,
    poh: 7,
    molesAnalyteRemaining: 0,
    molesTitrantAdded: 0,
    excessReagent: "equivalence",
    explanationStep: "",
    formulasUsed: [],
  };

  const t = {
    title: isArabic ? "المعايرة الكيميائية الرقمية" : "Digital Titration Lab",
    tagline: isArabic ? "محاكي المعايرة الكيميائية العالية الدقة للجامعات" : "High-precision computer simulation of acid-base titration",
    shortcuts: isArabic ? "مفاتيح الاختصار" : "Keyboard Shortcuts",
    fullscreen: isArabic ? "ملء الشاشة" : "Fullscreen",
    savesTitle: isArabic ? "سجلات المختبر" : "Laboratory Records",
    saveBtn: isArabic ? "حفظ التقرير" : "Save Record",
    playBtn: isArabic ? "بدء الإضافة" : "Pour",
    pauseBtn: isArabic ? "إيقاف مؤقت" : "Pause",
    resetBtn: isArabic ? "إعادة ضبط" : "Reset",
    drop1: isArabic ? "+قطرة واحدة" : "+1 Drop",
    drop5: isArabic ? "+٥ قطرات" : "+5 Drops",
    drop10: isArabic ? "+١٠ قطرات" : "+10 Drops",
    continuousRate: isArabic ? "معدل التدفق:" : "Flow Rate:",
    normal: isArabic ? "عادي" : "Normal",
    fast: isArabic ? "سريع جداً" : "Fast",
    drip: isArabic ? "قطرة بقطرة" : "Drip",
    savesEmpty: isArabic ? "لا توجد سجلات محفوظة." : "No saved records.",
    saveModelTitle: isArabic ? "احفظ حالة التجربة" : "Save State Log",
    savePlaceholder: isArabic ? "معايرة الخل بتركيز ٠.١ مولار" : "0.1M Acetic Acid vs NaOH",
  };

  return (
    <div className="min-h-screen bg-[#030305] text-zinc-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Dynamic Ambient Glow Layers */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/3 blur-[100px] pointer-events-none z-0" />

      {/* Floating Space Dust Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
            className="absolute rounded-full bg-cyan-400/20 blur-[0.3px]"
            animate={{
              y: [0, -180],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* 1. TOP GLOBAL TRANSPARENT GLASS NAVIGATION */}
      <header className="bg-zinc-950/40 backdrop-blur-xl border-b border-white/10 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-5 z-20 print:hidden relative">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-950/50 text-cyan-400 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <FlaskConical className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-xl text-white uppercase flex items-center gap-1 font-mono">
                CHEM<span className="text-cyan-400">LAB</span>
              </span>
              <span className="text-xs text-zinc-400 border-l border-zinc-800 pl-3 ml-3 hidden sm:inline-block font-medium">
                {isArabic ? "معاير عالي الدقة v5.0" : "High-Precision Titrator v5.0"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-cyan-950/40 text-cyan-400 text-[10px] font-mono px-2.5 py-1 rounded-full border border-cyan-500/20 font-bold tracking-wider uppercase">
              {isArabic ? "مستقر" : "System Live"}
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/5"
            title={t.shortcuts}
          >
            <Keyboard className="w-5.5 h-5.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/5"
            title={t.fullscreen}
          >
            <Maximize className="w-5.5 h-5.5" />
          </button>

          <button
            onClick={() => setIsArabic(!isArabic)}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 text-sm font-semibold rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Languages className="w-4 h-4 text-cyan-400" />
            <span>{isArabic ? "English" : "العربية"}</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN LAB GRID */}
      <main className="flex-1 max-w-[1850px] w-full mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 print:block z-10 relative">
        
        {/* LEFT COLUMN: Input Configuration & Local Saves (lg:col-span-3) */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
          className="lg:col-span-3 flex flex-col gap-8 print:hidden min-w-[350px]"
        >
          {/* Visual Inputs Panel */}
          <InputPanel
            analyte={analyte}
            titrant={titrant}
            selectedPresetId={selectedPresetId}
            selectedIndicatorName={selectedIndicatorName}
            temperature={temperature}
            dropVolume={dropVolume}
            burettePrecision={burettePrecision}
            isArabic={isArabic}
            onUpdateConfig={handleUpdateConfig}
            isSimulating={isSimulating}
          />

          {/* Local Saves list - Apple Glassmorphism style */}
          <div className="bg-zinc-950/45 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] glass-layered-shadow p-7 flex flex-col gap-4.5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                <FolderOpen className="w-4.5 h-4.5 text-cyan-400" />
                {t.savesTitle}
              </span>
              <button
                onClick={() => setShowSaveModal(true)}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-cyan-950/30 hover:bg-cyan-950/50 px-3.5 py-2 rounded-lg border border-cyan-500/20 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t.saveBtn}
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {savedExperiments.map((exp) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleLoadExperiment(exp)}
                    className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 p-3.5 rounded-xl flex items-center justify-between gap-3.5 cursor-pointer transition-all duration-300"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-zinc-200 truncate">
                        {exp.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-2 mt-1">
                        <span>{exp.date}</span>
                        <span>•</span>
                        <span className="text-cyan-400">{exp.state.volumeAdded.toFixed(2)} mL</span>
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteExperiment(exp.id, e)}
                      className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {savedExperiments.length === 0 && (
                <div className="text-center py-8 text-xs text-zinc-500 italic font-medium">
                  {t.savesEmpty}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* CENTER COLUMN: Horizontally Centered Lab Apparatus & Primary Controls (lg:col-span-6) */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.18 }}
          className="lg:col-span-6 flex flex-col gap-8 items-center print:hidden"
        >
          {/* centered titration simulation */}
          <LabEquipment
            volumeAdded={volumeAdded}
            currentPh={currentStep.ph}
            currentConductivity={currentStep.conductivity}
            temperature={temperature}
            indicatorColor={currentStep.indicatorColor}
            isSimulating={isSimulating}
            isArabic={isArabic}
            stirrerSpeed={stirrerSpeed}
            onDropComplete={handleBuretteDropComplete}
            dropVolume={dropVolume}
            pourSpeed={pourSpeed}
            triggerDropCount={triggerDropCount}
            onDropImpact={addVolume}
            onTriggerManualDrop={handleTriggerManualDrops}
            onStirrerSpeedChange={setStirrerSpeed}
          />

          {/* Action controls panel - placed directly under centered apparatus */}
          <div className="bg-zinc-950/45 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] glass-layered-shadow p-7 flex flex-col gap-5 w-full">
            
            {/* volume Added tracking banner */}
            <div className="flex justify-between items-center bg-zinc-950/65 border border-white/5 p-5 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono leading-none">
                  {isArabic ? "حجم المعاير المصبوب" : "Titrant Added Volume"}
                </span>
                <span className="text-4xl font-extrabold font-mono text-emerald-400 tracking-wider mt-2.5 flex items-baseline gap-1">
                  <AnimatedNumber value={volumeAdded} precision={3} /> <span className="text-sm font-normal text-zinc-500">mL</span>
                </span>
              </div>

              {/* Undo Redo controls */}
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1.5 rounded-xl">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-20 cursor-pointer transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-20 cursor-pointer transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Pour drop flow keys */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center justify-center gap-2.5 font-bold px-6 py-3.5 rounded-xl text-xs transition-all duration-300 cursor-pointer shadow-lg border w-full sm:w-auto ${
                  isSimulating
                    ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-500/30 shadow-rose-950/20"
                    : "bg-cyan-500 hover:bg-cyan-600 text-black border-cyan-400/20 shadow-cyan-950/10"
                }`}
              >
                {isSimulating ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-current" />}
                <span>{isSimulating ? t.pauseBtn : t.playBtn}</span>
              </button>

              <button
                onClick={() => handleTriggerManualDrops(1)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-bold px-5 py-3.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm disabled:opacity-30 font-mono"
              >
                <ChevronRight className="w-4.5 h-4.5 text-cyan-400" />
                <span>{t.drop1}</span>
              </button>

              <button
                onClick={() => handleTriggerManualDrops(5)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-bold px-5 py-3.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm disabled:opacity-30 font-mono"
              >
                <span>{t.drop5}</span>
              </button>

              <button
                onClick={() => handleTriggerManualDrops(10)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-bold px-5 py-3.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm disabled:opacity-30 font-mono"
              >
                <span>{t.drop10}</span>
              </button>

              {/* Reset button */}
              <button
                onClick={() => {
                  setVolumeAdded(0.0);
                  setIsSimulating(false);
                  setUndoStack([]);
                  setRedoStack([]);
                  setTriggerDropCount(0);
                }}
                className="flex items-center justify-center gap-2 bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-zinc-300 font-semibold px-5 py-3.5 rounded-xl text-xs transition-all cursor-pointer sm:ml-auto w-full sm:w-auto"
              >
                <RotateCcw className="w-4.5 h-4.5 text-zinc-400" />
                <span>{t.resetBtn}</span>
              </button>
            </div>

            {/* Drip rates speeds */}
            {isSimulating && (
              <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-5 text-xs font-semibold text-zinc-400">
                <span>{t.continuousRate}</span>
                <div className="flex bg-zinc-950 border border-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setPourSpeed(3)}
                    className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      pourSpeed === 3 ? "bg-cyan-500 text-black" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t.drip}
                  </button>
                  <button
                    onClick={() => setPourSpeed(1)}
                    className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      pourSpeed === 1 ? "bg-cyan-500 text-black" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t.normal}
                  </button>
                  <button
                    onClick={() => setPourSpeed(2)}
                    className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      pourSpeed === 2 ? "bg-cyan-500 text-black" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t.fast}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* RIGHT COLUMN: Formula steps & Chemical Equations (lg:col-span-3) */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.26 }}
          className="lg:col-span-3 flex flex-col gap-8 print:hidden min-w-[350px]"
        >
          <FormulaInspector
            step={currentStep}
            analyte={analyte}
            titrant={titrant}
            temperature={temperature}
            isArabic={isArabic}
            activePrinciple={activePrinciple}
          />
          <TheoryReference 
            isArabic={isArabic} 
            activePrinciple={activePrinciple}
            onSelectPrinciple={setActivePrinciple}
          />
        </motion.section>

        {/* BOTTOM SECTION: Bento Grid of Analytical Graphs and Logs (lg:col-span-12) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 14, delay: 0.34 }}
          className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 print:block"
        >
          {/* Left Bento: Graphs */}
          <div className="lg:col-span-7 flex flex-col print:hidden">
            <Graphs
              steps={fullCurveSteps}
              currentVolumeAdded={volumeAdded}
              titrationType={analyte.isAcid ? TitrationType.WeakAcid_StrongBase : TitrationType.StrongAcid_WeakBase}
              isArabic={isArabic}
            />
          </div>

          {/* Right Bento: Logs Table */}
          <div className="lg:col-span-5 flex flex-col print:block">
            <ResultsTable
              steps={activeSteps}
              currentVolumeAdded={volumeAdded}
              isArabic={isArabic}
              analyteName={analyte.name}
              titrantName={titrant.name}
            />
          </div>
        </motion.section>

      </main>

      {/* 3. SAVES & SHORTCUTS MODALS */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              <Save className="w-5 h-5 text-cyan-400" />
              {t.saveModelTitle}
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">{isArabic ? "اسم السجل الكيميائي:" : "Configuration Name:"}</label>
              <input
                type="text"
                placeholder={t.savePlaceholder}
                value={saveNameInput}
                onChange={(e) => setSaveNameInput(e.target.value)}
                className="w-full text-xs p-3 border border-white/10 bg-zinc-950/80 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium placeholder:text-zinc-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                onClick={() => { setShowSaveModal(false); setSaveNameInput(""); }}
                className="px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveExperiment}
                className="px-5 py-2.5 text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-black rounded-xl shadow-lg cursor-pointer transition-colors"
              >
                {isArabic ? "حفظ التقرير" : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortcutsModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2.5 font-mono">
              <Keyboard className="w-5 h-5 text-cyan-400" />
              {t.shortcuts}
            </h3>

            <div className="flex flex-col gap-3 font-mono mt-1 text-zinc-300">
              <div className="flex justify-between items-center text-xs">
                <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-cyan-400">[Space]</span>
                <span className="font-sans font-semibold text-zinc-400">{isArabic ? "تشغيل / إيقاف التدفق" : "Play/Pause Flow"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-cyan-400">[Arrow Right]</span>
                <span className="font-sans font-semibold text-zinc-400">{isArabic ? "إضافة قطرة واحدة" : "Add 1 Drop"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-cyan-400">[Ctrl + Z]</span>
                <span className="font-sans font-semibold text-zinc-400">{isArabic ? "التراجع عن آخر خطوة" : "Undo Step"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-cyan-400">[Ctrl + Y]</span>
                <span className="font-sans font-semibold text-zinc-400">{isArabic ? "إعادة الخطوة الملغاة" : "Redo Step"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-cyan-400">[Escape]</span>
                <span className="font-sans font-semibold text-zinc-400">{isArabic ? "إعادة ضبط التجربة" : "Reset Laboratory"}</span>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="mt-3 w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2.5 rounded-xl text-center cursor-pointer transition-colors text-xs"
            >
              {isArabic ? "فهمت" : "Got it"}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-8 text-center z-10 relative print:hidden flex flex-col items-center gap-4">
        {/* المنتصف: توقيعك الملكي (البصمة) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center group cursor-default"
        >
          <span className="text-[9px] uppercase tracking-[0.4em] text-zinc-600 group-hover:text-cyan-500 transition-colors duration-500 mb-1">
            Developed & Designed by
          </span>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black italic tracking-tighter transition-all duration-500">
              <span className="text-white group-hover:text-cyan-400">youssef website</span>
              <span className="text-zinc-600 mx-2">by</span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">YIC</span>
            </h3>
          </div>
          <div className="w-0 group-hover:w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent transition-all duration-700 mt-2 opacity-50" />
        </motion.div>

        <p className="text-[10px] text-zinc-500 font-medium font-mono uppercase tracking-wider">
          &copy; 2026 YOUSSEF CHEMISTRY GUIDE. ALL RIGHTS RESERVED.
        </p>
      </footer>

    </div>
  );
}
