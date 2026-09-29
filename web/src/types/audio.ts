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
