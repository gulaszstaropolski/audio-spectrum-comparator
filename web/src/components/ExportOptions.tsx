import { useState } from "react";
import type { AnalysisResult } from "../types/audio";
import { calculateEqCorrections } from "../utils/frequencyBands";
import { downloadChart, downloadCsv, downloadEqPreset, type EqPresetFormat } from "../utils/exportUtils";

export default function ExportOptions({
  analysis,
  activeTab,
}: {
  analysis: AnalysisResult;
  activeTab: "heatmap" | "spectrum" | "bands" | "correction" | "data";
}) {
  const [eqFormat, setEqFormat] = useState<EqPresetFormat>("json");
  const chartId = {
    heatmap: "heatmap-chart",
    spectrum: "spectrum-chart",
    bands: "band-chart",
    correction: "correction-chart",
  } as const;
  return (
    <div className="export-actions">
      <button className="button button-secondary" onClick={() => downloadCsv(analysis)}>
        Download CSV
      </button>
      <button className="button button-secondary" onClick={() => window.print()}>
        Print / save PDF
      </button>
      {activeTab === "correction" && (
        <div className="export-eq-preset">
          <select
            className="session-select"
            aria-label="EQ preset format"
            value={eqFormat}
            onChange={(event) => setEqFormat(event.target.value as EqPresetFormat)}
          >
            <option value="json">JSON</option>
            <option value="txt">TXT</option>
            <option value="csv">CSV</option>
          </select>
          <button
            className="button button-primary"
            onClick={() =>
              downloadEqPreset(calculateEqCorrections(analysis.bands), eqFormat)
            }
          >
            Export EQ Preset
          </button>
        </div>
      )}
      {activeTab !== "data" && activeTab !== "correction" && (
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
