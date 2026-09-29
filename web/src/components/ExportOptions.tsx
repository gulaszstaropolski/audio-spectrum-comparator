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
            title="Choose the export format for the EQ correction preset"
            value={eqFormat}
            onChange={(event) => setEqFormat(event.target.value as EqPresetFormat)}
          >
            <option value="json" title="Generic JSON preset with all band data">
              Generic JSON
            </option>
            <option value="txt" title="Generic human-readable text preset">
              Generic TXT
            </option>
            <option value="csv" title="Generic CSV spreadsheet of band data">
              Generic CSV
            </option>
            <option
              value="fabfilter"
              title="FabFilter Pro-Q 3 readable preset (.txt) with Band1, Band2, ... and 100% mix"
            >
              FabFilter Pro-Q 3
            </option>
            <option
              value="presonus"
              title="PreSonus Pro EQ preset (.txt) compatible with Studio One"
            >
              PreSonus Pro EQ
            </option>
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
