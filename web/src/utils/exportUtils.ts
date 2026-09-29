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

// Both FabFilter Pro-Q 3 (.fxp) and PreSonus Pro EQ (.preset) use closed,
// undocumented binary preset formats:
// - FabFilter Pro-Q 3 presets are raw VST ".fxp" chunks with no public spec.
// - PreSonus Pro EQ presets use the ".preset" extension (confirmed against
//   real Studio One preset files), but a ".preset" file is itself a ZIP
//   archive containing "metainfo.xml" plus an opaque, compressed
//   "data.fxpreset" binary blob with an undocumented, plugin-specific
//   parameter layout — there is no official spec to safely reproduce it.
// Fabricating either binary format would produce a file that either fails
// to load or silently loads with wrong values, so instead we export a
// plain-text, step-by-step reference listing each band's exact parameters
// (Frequency, Gain, Q, filter type) in the order they need to be entered
// manually into the plugin.
export type EqPresetFormat = "fabfilter" | "presonus";

// Fixed filenames (no timestamp) as specified for these exports. Repeated
// downloads of the same format will get "(1)", "(2)", etc. appended by the
// browser, which is expected/acceptable here since each file's content is
// re-derived from the current analysis at download time (see
// downloadEqPreset below), not a versioned artifact that needs distinct
// timestamped names to avoid data loss.
const EQ_PRESET_FILE_INFO: Record<EqPresetFormat, string> = {
  fabfilter: "eq-correction-fabfilter-instructions.txt",
  presonus: "eq-correction-presonus.txt",
};

type VstPresetLabels = {
  title: string;
  copyNote: string;
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
    labels.copyNote,
    `Format: Band N (name): Frequency Hz, Gain dB, ${labels.qLabel}: value (${labels.typeLabel}: type, ${labels.bypassLabel}: state)`,
    "",
  ];
  bands.forEach((band, index) => {
    const gain = `${band.correctionDb >= 0 ? "+" : ""}${band.correctionDb.toFixed(2)} dB`;
    const warningText = formatExtremeWarning(band);
    const warning = warningText ? `  [!] ${warningText}` : "";
    lines.push(
      `Band ${index + 1} (${band.name}): ${band.center} Hz, ${gain}, ${labels.qLabel}: ${band.q.toFixed(2)} ` +
        `(${labels.typeLabel}: ${labels.typeNames[band.eqType]}, ${labels.bypassLabel}: ${band.bypass ? labels.bypassedValue : labels.activeValue})${warning}`,
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
    title: "FabFilter Pro-Q 3 - Step-by-Step Band Settings",
    copyNote:
      "Copy these values into FabFilter Pro-Q 3 manually: for each band below, add a band in Pro-Q 3, " +
      "then set Frequency, Gain, Q and Shape to the values shown.",
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
    title: "PreSonus Pro EQ - Step-by-Step Band Settings",
    copyNote:
      "Copy these values into PreSonus Pro EQ manually: for each band below, add/select a band in Pro EQ, " +
      "then set Frequency, Gain, Bandwidth (Q) and Type to the values shown.",
    qLabel: "Bandwidth (Q)",
    typeLabel: "Type",
    typeNames: PRESONUS_TYPE_NAMES,
    bypassLabel: "Band On",
    bypassedValue: "No",
    activeValue: "Yes",
  });
}

export function downloadEqPreset(bands: EqCorrectionBand[], format: EqPresetFormat): void {
  const filename = EQ_PRESET_FILE_INFO[format];
  const content = format === "fabfilter" ? buildFabFilterPreset(bands) : buildPresonusPreset(bands);
  triggerDownload(content, filename, "text/plain;charset=utf-8");
}
