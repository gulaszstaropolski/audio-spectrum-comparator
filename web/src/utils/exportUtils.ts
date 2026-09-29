import Plotly from "../plotly";
import type { AnalysisResult, EqCorrectionBand } from "../types/audio";

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

function eqPresetFilename(format: EqPresetFormat): string {
  if (format === "fabfilter") return "eq-correction-fabfilter.txt";
  if (format === "presonus") return "eq-correction-presonus.txt";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `eq-correction-${timestamp}.${format}`;
}

const FAB_FILTER_SHAPES: Record<EqCorrectionBand["eqType"], string> = {
  Peaking: "Bell",
  LowShelf: "Low Shelf",
  HighShelf: "High Shelf",
  Notch: "Notch",
};

const PRESONUS_TYPES: Record<EqCorrectionBand["eqType"], string> = {
  Peaking: "Parametric",
  LowShelf: "LowShelf",
  HighShelf: "HighShelf",
  Notch: "Notch",
};

function formatGain(gainDb: number): string {
  return `${gainDb >= 0 ? "+" : ""}${gainDb.toFixed(2)}`;
}

function buildEqPresetFabFilter(bands: EqCorrectionBand[]): string {
  const lines = [
    "FabFilter Pro-Q 3 Preset",
    `Generated: ${new Date().toISOString()}`,
    "",
    "MasterGain: 0.00 dB",
    "Mix: 100 %",
    "",
  ];
  bands.forEach((band, index) => {
    const bandNumber = index + 1;
    const shape = FAB_FILTER_SHAPES[band.eqType];
    const gain = formatGain(band.correctionDb);
    lines.push(
      `Band${bandNumber}: Enabled=1 Shape=${shape} Frequency=${band.center} Hz Gain=${gain} dB Q=${band.q}`,
    );
  });
  return lines.join("\r\n");
}

function buildEqPresetPresonus(bands: EqCorrectionBand[]): string {
  const lines = [
    "PreSonus Pro EQ Preset",
    `Generated: ${new Date().toISOString()}`,
    "",
    "[Pro EQ]",
    "Bands=" + bands.length,
    "",
  ];
  bands.forEach((band, index) => {
    const bandNumber = index + 1;
    const type = PRESONUS_TYPES[band.eqType];
    const gain = formatGain(band.correctionDb);
    lines.push(`[Band ${bandNumber}]`);
    lines.push(`Type=${type}`);
    lines.push(`Frequency=${band.center}`);
    lines.push(`Gain=${gain}`);
    lines.push(`Q=${band.q}`);
    lines.push(`Enabled=1`);
    lines.push("");
  });
  return lines.join("\r\n");
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
      enabled: true,
    })),
  };
  return JSON.stringify(preset, null, 2);
}

function buildEqPresetTxt(bands: EqCorrectionBand[]): string {
  const lines = [
    "Audio Spectrum Comparator - EQ Correction Preset",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Band | Frequency | Type | Gain | Q",
  ];
  bands.forEach((band) => {
    const gain = `${formatGain(band.correctionDb)} dB`;
    lines.push(
      `${band.name} (${band.range}) | ${band.center} Hz | ${band.eqType} | ${gain} | Q ${band.q}`,
    );
  });
  return lines.join("\r\n");
}

function buildEqPresetCsv(bands: EqCorrectionBand[]): string {
  const rows = [
    ["Band", "Range", "Frequency (Hz)", "Type", "Gain (dB)", "Q"],
    ...bands.map((band) => [
      band.name,
      band.range,
      String(band.center),
      band.eqType,
      band.correctionDb.toFixed(2),
      String(band.q),
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
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
    triggerDownload(buildEqPresetFabFilter(bands), filename, "text/plain;charset=utf-8");
  } else if (format === "presonus") {
    triggerDownload(buildEqPresetPresonus(bands), filename, "text/plain;charset=utf-8");
  } else {
    const unknownFormat: never = format;
    throw new Error(`Unsupported EQ preset format: ${String(unknownFormat as string)}`);
  }
}
