import { useMemo, useState } from "react";
import type { AnalysisResult } from "../types/audio";
import { calculateEqCorrections, formatExtremeWarning } from "../utils/frequencyBands";
import { downloadChart, downloadCsv, downloadEqPreset, type EqPresetFormat } from "../utils/exportUtils";

const EQ_FORMAT_LABELS: Record<EqPresetFormat, string> = {
  fabfilter: "FabFilter Pro-Q 3 Instructions (TXT)",
  presonus: "PreSonus Pro EQ Instructions (TXT)",
};

export default function ExportOptions({
  analysis,
  activeTab,
}: {
  analysis: AnalysisResult;
  activeTab: "heatmap" | "spectrum" | "bands" | "correction" | "data" | "standards";
}) {
  const [eqFormat, setEqFormat] = useState<EqPresetFormat>("fabfilter");
  const [showPreview, setShowPreview] = useState(false);
  const chartId = {
    heatmap: "heatmap-chart",
    spectrum: "spectrum-chart",
    bands: "band-chart",
    correction: "correction-chart",
  } as const;
  const eqCorrections = useMemo(
    () => calculateEqCorrections(analysis.bands),
    [analysis],
  );
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
            {(Object.keys(EQ_FORMAT_LABELS) as EqPresetFormat[]).map((format) => (
              <option value={format} key={format}>
                {EQ_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
          <button
            className="button button-secondary"
            onClick={() => setShowPreview((value) => !value)}
            aria-expanded={showPreview}
          >
            {showPreview ? "Hide preview" : "Preview preset"}
          </button>
          <button
            className="button button-primary"
            onClick={() => downloadEqPreset(eqCorrections, eqFormat)}
          >
            Export EQ Preset
          </button>
        </div>
      )}
      {activeTab === "correction" && showPreview && (
        <div className="eq-preset-preview">
          <table>
            <thead>
              <tr>
                <th>Band</th>
                <th>Frequency</th>
                <th>Gain</th>
                <th>Q</th>
                <th>Type</th>
                <th>Bypass</th>
              </tr>
            </thead>
            <tbody>
              {eqCorrections.map((band) => (
                <tr key={band.name} className={band.exceedsThreshold ? "preview-row-warning" : undefined}>
                  <td>{band.name}</td>
                  <td>{band.center} Hz</td>
                  <td className={band.correctionDb >= 0 ? "value-boost" : "value-cut"}>
                    {band.correctionDb >= 0 ? "+" : ""}
                    {band.correctionDb.toFixed(2)} dB
                    {band.exceedsThreshold && (
                      <span title={formatExtremeWarning(band)}> ⚠</span>
                    )}
                  </td>
                  <td>{band.q.toFixed(2)}</td>
                  <td>{band.eqType}</td>
                  <td>{band.bypass ? "Bypassed" : "Active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeTab !== "data" && activeTab !== "correction" && activeTab !== "standards" && (
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
