import Plotly from "../plotly";
import type { AnalysisResult, EqCorrectionBand, EqType } from "../types/audio";
import { formatExtremeWarning } from "./frequencyBands";

function csvCell(value: string | number): string {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(analysis: AnalysisResult): void {
  const rows = [
    ["Frequency (Hz)", "Reference (dBFS)", "Mix (dBFS)", "Difference (dB)"],
    ...analysis.frequencies.map((frequency, index) => [
      frequency.toFixed(2),
      analysis.referenceSpectrum[index].toFixed(3),
      analysis.mixSpectrum[index].toFixed(3),
      analysis.differenceDb[index].toFixed(3),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  triggerDownload(csv, "audio-spectrum-analysis.csv", "text/csv;charset=utf-8");
}

export function downloadChart(chartId: string, format: "png" | "svg"): void {
  const graph = document
    .getElementById(chartId)
    ?.querySelector(".js-plotly-plot") as HTMLElement | null;
  if (!graph) return;
  void Plotly.downloadImage(graph, {
    format,
    filename: `audio-spectrum-${chartId}`,
    width: 1400,
    height: 800,
  });
}

export type EqPresetFormat = "json" | "txt" | "csv" | "fabfilter" | "presonus";

const EQ_PRESET_FILE_INFO: Record<EqPresetFormat, { prefix: string; extension: string }> = {
  json: { prefix: "eq-correction", extension: "json" },
  txt: { prefix: "eq-correction", extension: "txt" },
  csv: { prefix: "eq-correction", extension: "csv" },
  fabfilter: { prefix: "eq-correction-fabfilter-pro-q3", extension: "txt" },
  presonus: { prefix: "eq-correction-presonus-pro-eq", extension: "txt" },
};

function eqPresetFilename(format: EqPresetFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const { prefix, extension } = EQ_PRESET_FILE_INFO[format];
  return `${prefix}-${timestamp}.${extension}`;
}

function buildEqPresetJson(bands: EqCorrectionBand[]): string {
  const preset = {
    name: "Audio Spectrum Comparator - EQ Correction",
    generatedAt: new Date().toISOString(),
    bands: bands.map((band, index) => ({
      index,
      name: band.name,
      range: band.range,
      frequency: band.center,
      gainDb: Number(band.correctionDb.toFixed(2)),
      q: band.q,
      type: band.eqType,
      bypass: band.bypass,
      exceedsThreshold: band.exceedsThreshold,
    })),
  };
  return JSON.stringify(preset, null, 2);
}

function buildEqPresetTxt(bands: EqCorrectionBand[]): string {
  const lines = [
    "Audio Spectrum Comparator - EQ Correction Preset",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Band | Frequency | Type | Gain | Q | Bypass",
  ];
  bands.forEach((band) => {
    const gain = `${band.correctionDb >= 0 ? "+" : ""}${band.correctionDb.toFixed(2)} dB`;
    lines.push(
      `${band.name} (${band.range}) | ${band.center} Hz | ${band.eqType} | ${gain} | Q ${band.q} | ${band.bypass ? "Bypassed" : "Active"}`,
    );
  });
  return lines.join("\r\n");
}

function buildEqPresetCsv(bands: EqCorrectionBand[]): string {
  const rows = [
    ["Band", "Range", "Frequency (Hz)", "Type", "Gain (dB)", "Q", "Bypass"],
    ...bands.map((band) => [
      band.name,
      band.range,
      String(band.center),
      band.eqType,
      band.correctionDb.toFixed(2),
      String(band.q),
      band.bypass ? "Bypassed" : "Active",
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

// FabFilter Pro-Q 3 and PreSonus Pro EQ both use proprietary preset formats
// that aren't publicly documented, so instead we generate a plain-text
// reference listing each band's parameters (Frequency, Gain, Q, filter
// type, Bypass) in the order they need to be entered per band, so the
// preset can be recreated in the plugin in a couple of minutes.
type VstPresetLabels = {
  title: string;
  instructions: string;
  qLabel: string;
  typeLabel: string;
  typeNames: Record<EqType, string>;
  bypassLabel: string;
  // Text shown next to bypassLabel when the band IS bypassed / inactive.
  bypassedValue: string;
  // Text shown next to bypassLabel when the band is active / not bypassed.
  activeValue: string;
};

function buildVstPreset(bands: EqCorrectionBand[], labels: VstPresetLabels): string {
  const lines = [
    labels.title,
    "Audio Spectrum Comparator - EQ Correction",
    `Generated: ${new Date().toISOString()}`,
    "",
    labels.instructions,
    "",
  ];
  bands.forEach((band, index) => {
    const gain = `${band.correctionDb >= 0 ? "+" : ""}${band.correctionDb.toFixed(2)} dB`;
    const warningText = formatExtremeWarning(band);
    const warning = warningText ? `  [!] ${warningText}` : "";
    lines.push(
      `Band ${index + 1} (${band.name}): Frequency = ${band.center} Hz | Gain = ${gain} | ` +
        `${labels.qLabel} = ${band.q.toFixed(2)} | ${labels.typeLabel} = ${labels.typeNames[band.eqType]} | ` +
        `${labels.bypassLabel} = ${band.bypass ? labels.bypassedValue : labels.activeValue}${warning}`,
    );
  });
  return lines.join("\r\n");
}

const FABFILTER_TYPE_NAMES: Record<EqType, string> = {
  Peaking: "Bell",
  LowShelf: "Low Shelf",
  HighShelf: "High Shelf",
  Notch: "Notch",
};

const PRESONUS_TYPE_NAMES: Record<EqType, string> = {
  Peaking: "Bell",
  LowShelf: "Shelf (Low)",
  HighShelf: "Shelf (High)",
  Notch: "Notch",
};

function buildFabFilterPreset(bands: EqCorrectionBand[]): string {
  return buildVstPreset(bands, {
    title: "FabFilter Pro-Q 3 - Band Settings",
    instructions:
      "For each band below: add a band in Pro-Q 3, then set Frequency, Gain, Q and Shape to the values shown.",
    qLabel: "Q",
    typeLabel: "Shape",
    typeNames: FABFILTER_TYPE_NAMES,
    bypassLabel: "Bypass",
    bypassedValue: "On",
    activeValue: "Off",
  });
}

function buildPresonusPreset(bands: EqCorrectionBand[]): string {
  return buildVstPreset(bands, {
    title: "PreSonus Pro EQ - Band Settings",
    instructions:
      "For each band below: add/select a band in Pro EQ, then set Frequency, Gain, Bandwidth (Q) and Type to the values shown.",
    qLabel: "Bandwidth (Q)",
    typeLabel: "Type",
    typeNames: PRESONUS_TYPE_NAMES,
    bypassLabel: "Band On",
    bypassedValue: "No",
    activeValue: "Yes",
  });
}

export function downloadEqPreset(bands: EqCorrectionBand[], format: EqPresetFormat): void {
  const filename = eqPresetFilename(format);
  if (format === "json") {
    triggerDownload(buildEqPresetJson(bands), filename, "application/json;charset=utf-8");
  } else if (format === "txt") {
    triggerDownload(buildEqPresetTxt(bands), filename, "text/plain;charset=utf-8");
  } else if (format === "csv") {
    triggerDownload(buildEqPresetCsv(bands), filename, "text/csv;charset=utf-8");
  } else if (format === "fabfilter") {
    triggerDownload(buildFabFilterPreset(bands), filename, "text/plain;charset=utf-8");
  } else {
    triggerDownload(buildPresonusPreset(bands), filename, "text/plain;charset=utf-8");
  }
}
