/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TitrationType {
  StrongAcid_StrongBase = "SA_SB",
  StrongAcid_WeakBase = "SA_WB",
  WeakAcid_StrongBase = "WA_SB",
  WeakAcid_WeakBase = "WA_WB",
  PolyproticAcid_StrongBase = "Poly_SB",
  Buffer_StrongAcid = "Buffer_SA",
  Buffer_StrongBase = "Buffer_SB",
}

export interface Chemical {
  name: string;
  formula: string;
  isAcid: boolean;
  isStrong: boolean;
  Ka?: number[]; // Array for polyprotic. [Ka1, Ka2, Ka3]
  Kb?: number;
  concentration: number; // mol/L
  initialVolume: number; // mL
  purity?: number; // % (default 100)
  density?: number; // g/mL (optional)
}

export interface Indicator {
  name: string;
  minPh: number;
  maxPh: number;
  acidColor: string; // hex
  baseColor: string; // hex
}

export interface TitrationPreset {
  id: string;
  name: string;
  arabicName: string;
  type: TitrationType;
  analyte: Chemical;
  titrant: Chemical;
  recommendedIndicator: string;
  description: string;
  arabicDescription: string;
}

export interface TitrationStepResult {
  volumeAdded: number; // mL titrant added
  totalVolume: number; // mL
  ph: number;
  poh: number;
  hConcentration: number; // mol/L [H+]
  ohConcentration: number; // mol/L [OH-]
  molesAnalyteRemaining: number;
  molesTitrantAdded: number;
  excessReagent: "analyte" | "titrant" | "equivalence";
  conductivity: number; // uS/cm (conductivity estimation)
  bufferCapacity: number; // beta
  dpH_dV: number; // first derivative dpH/dV
  speciesFractions: number[]; // e.g. [alpha0, alpha1, alpha2] for acid distribution
  indicatorColor: string; // hex color interpolated
  explanationStep: string; // summary explanation of the chemistry at this point
  formulasUsed: string[]; // formulas used at this step in LaTeX/text
}

export interface SimulationState {
  presetId: string;
  titrationType: TitrationType;
  analyte: Chemical;
  titrant: Chemical;
  selectedIndicatorName: string;
  temperature: number; // °C
  dropVolume: number; // mL, e.g. 0.05 mL per drop
  burettePrecision: number; // mL, e.g. 0.01 mL
  isSimulating: boolean;
  volumeAdded: number; // mL
  steps: TitrationStepResult[];
  undoStack: number[]; // volume history for undo
  redoStack: number[]; // volume history for redo
  stirrerSpeed: number; // 0 to 100
  isArabic: boolean;
  isDarkMode: boolean;
  showFormulaInspector: boolean;
  currentStepIndex: number; // active step being inspected
}

export interface SavedExperiment {
  id: string;
  name: string;
  date: string;
  state: {
    presetId: string;
    titrationType: TitrationType;
    analyte: Chemical;
    titrant: Chemical;
    selectedIndicatorName: string;
    temperature: number;
    dropVolume: number;
    burettePrecision: number;
    volumeAdded: number;
  };
}
