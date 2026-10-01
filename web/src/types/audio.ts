export type EqType = "Peaking" | "LowShelf" | "HighShelf" | "Notch";

export type FrequencyBand = {
  name: string;
  range: string;
  low: number;
  high: number;
  center: number;
  q: number;
  eqType: EqType;
  differenceDb: number;
};

export type EqCorrectionBand = {
  name: string;
  range: string;
  center: number;
  q: number;
  eqType: EqType;
  correctionDb: number;
  // Whether the correction is small enough that the band should be treated
  // as inactive/bypassed rather than applied.
  bypass: boolean;
  // Whether the correction exceeds the "extreme move" threshold.
  exceedsThreshold: boolean;
};

export type ComplianceNorm = {
  lowerDb: number;
  upperDb: number;
};

export type ComplianceNorms = Record<string, ComplianceNorm>;

export type ComplianceStandard = "Streaming" | "Radio" | "TV/Broadcast" | "Custom";

export type ComplianceBandResult = {
  id: string;
  name: string;
  range: string;
  differenceDb: number;
  lowerDb: number;
  upperDb: number;
  status: "within" | "above" | "below";
};

export type ComplianceViolation = {
  band: string;
  range: string;
  differenceDb: number;
  limitDb: number;
  direction: "above" | "below";
  amountDb: number;
};

export type ComplianceResult = {
  standard: ComplianceStandard;
  bands: ComplianceBandResult[];
  violations: ComplianceViolation[];
};

export type AnalysisResult = {
  frequencies: number[];
  referenceSpectrum: number[];
  mixSpectrum: number[];
  differenceDb: number[];
  times: number[];
  heatmapFrequencies: number[];
  heatmapValues: number[][];
  bands: FrequencyBand[];
  sampleRate: number;
  duration: number;
  normalizationGainDb: number;
  compliance?: ComplianceResult;
};

export type SavedSession = {
  id: string;
  name: string;
  savedAt: string;
  analysis: AnalysisResult;
};
