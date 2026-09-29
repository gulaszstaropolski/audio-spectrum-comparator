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
};

export type SavedSession = {
  id: string;
  name: string;
  savedAt: string;
  analysis: AnalysisResult;
};
