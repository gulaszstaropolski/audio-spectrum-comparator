export type FrequencyBand = {
  name: string;
  range: string;
  low: number;
  high: number;
  differenceDb: number;
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
