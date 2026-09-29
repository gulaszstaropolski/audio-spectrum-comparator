import type { AnalysisResult } from "../types/audio";
import { downloadChart, downloadCsv } from "../utils/exportUtils";

export default function ExportOptions({
  analysis,
  activeTab,
}: {
  analysis: AnalysisResult;
  activeTab: "heatmap" | "spectrum" | "bands" | "data";
}) {
  const chartId = {
    heatmap: "heatmap-chart",
    spectrum: "spectrum-chart",
    bands: "band-chart",
  } as const;
  return (
    <div className="export-actions">
      <button className="button button-secondary" onClick={() => downloadCsv(analysis)}>
        Download CSV
      </button>
      <button className="button button-secondary" onClick={() => window.print()}>
        Print / save PDF
      </button>
      {activeTab !== "data" && (
        <div className="export-chart">
          <span>Current chart</span>
          <span className="chart-export-pair">
            <button
              className="text-button"
              onClick={() => downloadChart(chartId[activeTab], "png")}
              aria-label="Download current chart as PNG"
            >
              PNG
            </button>
            <button
              className="text-button"
              onClick={() => downloadChart(chartId[activeTab], "svg")}
              aria-label="Download current chart as SVG"
            >
              SVG
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
