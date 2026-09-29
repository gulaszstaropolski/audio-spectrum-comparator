import Plotly from "../plotly";
import type { AnalysisResult } from "../types/audio";

function csvCell(value: string | number): string {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
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
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "audio-spectrum-analysis.csv";
  link.click();
  URL.revokeObjectURL(url);
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
