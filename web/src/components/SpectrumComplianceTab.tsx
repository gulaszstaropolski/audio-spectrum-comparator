import { useMemo } from "react";
import Plot from "./Plot";
import type { AnalysisResult, ComplianceNorms, ComplianceStandard } from "../types/audio";
import {
  analyzeCompliance,
  COMPLIANCE_BANDS,
  COMPLIANCE_STANDARDS,
  formatViolationMessage,
  getComplianceColor,
} from "../utils/spectrumCompliance";

export default function SpectrumComplianceTab({
  analysis,
  standard,
  setStandard,
  customNorms,
  setCustomNorms,
}: {
  analysis: AnalysisResult;
  standard: ComplianceStandard;
  setStandard: (standard: ComplianceStandard) => void;
  customNorms: ComplianceNorms;
  setCustomNorms: React.Dispatch<React.SetStateAction<ComplianceNorms>>;
}) {
  const norms = standard === "Custom" ? customNorms : COMPLIANCE_STANDARDS[standard];
  const result = useMemo(
    () => analyzeCompliance(analysis, standard, norms),
    [analysis, standard, norms],
  );
  const textColor = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue("--border").trim();

  function updateNorm(id: string, key: "lowerDb" | "upperDb", value: number) {
    setCustomNorms((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  }

  return (
    <section className="compliance-panel" aria-label="Spectrum compliance analysis">
      <div className="compliance-controls">
        <label>
          <span>Target profile</span>
          <select
            className="session-select"
            value={standard}
            onChange={(event) => setStandard(event.target.value as ComplianceStandard)}
          >
            <option value="Streaming">Streaming</option>
            <option value="Radio">Radio</option>
            <option value="TV/Broadcast">TV/Broadcast (EBU R128)</option>
            <option value="Custom">Custom</option>
          </select>
        </label>
        <p>These profiles compare your mix’s tonal balance with the reference; they are guides, not certification tests.</p>
      </div>

      {standard === "Custom" && (
        <div className="compliance-editor" aria-label="Custom tolerance editor">
          {COMPLIANCE_BANDS.map((band) => {
            const norm = customNorms[band.id];
            return (
              <fieldset key={band.id}>
                <legend>{band.name} <span>{band.range}</span></legend>
                <label>
                  <span>Lower limit: {norm.lowerDb.toFixed(1)} dB</span>
                  <input
                    type="range"
                    min="-12"
                    max="0"
                    step="0.5"
                    value={norm.lowerDb}
                    aria-label={`${band.name} lower limit`}
                    onChange={(event) => updateNorm(band.id, "lowerDb", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Upper limit: +{norm.upperDb.toFixed(1)} dB</span>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={norm.upperDb}
                    aria-label={`${band.name} upper limit`}
                    onChange={(event) => updateNorm(band.id, "upperDb", Number(event.target.value))}
                  />
                </label>
              </fieldset>
            );
          })}
        </div>
      )}

      <div className="compliance-chart" id="compliance-chart">
        <Plot
          data={[
            {
              type: "scatter",
              mode: "lines",
              x: result.bands.map((band) => band.name),
              y: result.bands.map((band) => band.lowerDb),
              line: { color: "rgba(137, 151, 168, 0.25)", width: 1 },
              hoverinfo: "skip",
              showlegend: false,
            },
            {
              type: "scatter",
              mode: "lines",
              x: result.bands.map((band) => band.name),
              y: result.bands.map((band) => band.upperDb),
              line: { color: "rgba(137, 151, 168, 0.25)", width: 1 },
              fill: "tonexty",
              fillcolor: "rgba(137, 151, 168, 0.16)",
              hoverinfo: "skip",
              showlegend: false,
            },
            {
              type: "bar",
              x: result.bands.map((band) => band.name),
              y: result.bands.map((band) => band.differenceDb),
              marker: { color: result.bands.map((band) => getComplianceColor(band.status)) },
              customdata: result.bands.map((band) => [
                band.range,
                band.lowerDb,
                band.upperDb,
                band.status,
              ]),
              hovertemplate:
                "<b>%{x}</b> (%{customdata[0]})<br>Difference: %{y:+.1f} dB" +
                "<br>Limits: %{customdata[1]:+.1f} to %{customdata[2]:+.1f} dB" +
                "<br>Status: %{customdata[3]}<extra></extra>",
              showlegend: false,
            },
          ]}
          layout={{
            autosize: true,
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: textColor, family: "Inter, sans-serif" },
            margin: { l: 65, r: 20, t: 20, b: 70 },
            xaxis: { gridcolor: gridColor, zeroline: false },
            yaxis: {
              title: { text: "Mix − reference (dB)" },
              gridcolor: gridColor,
              zeroline: true,
              zerolinecolor: textColor,
            },
            uirevision: `compliance-${standard}`,
          }}
          config={{ responsive: true, displaylogo: false }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="compliance-summary">
        <h3>Band-by-band results · {result.violations.length} {result.violations.length === 1 ? "violation" : "violations"}</h3>
        <div className="compliance-results">
          {result.bands.map((band) => (
            <div className="compliance-result" key={band.id}>
              <strong>{band.name}</strong>
              <span className="compliance-result-range">{band.range}</span>
              <span className="compliance-result-value">
                {band.differenceDb >= 0 ? "+" : ""}{band.differenceDb.toFixed(1)} dB
                <small> · {band.lowerDb.toFixed(1)} to +{band.upperDb.toFixed(1)} dB</small>
              </span>
              <span className={`compliance-status compliance-${band.status}`}>
                {band.status === "within"
                  ? "Within limits"
                  : formatViolationMessage(result.violations.find((violation) => violation.band === band.name)!)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
