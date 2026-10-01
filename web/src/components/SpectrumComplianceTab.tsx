import { useState, useMemo } from "react";
import type { AnalysisResult } from "../types/audio";
import type { ComplianceNorms, ComplianceStandard } from "../utils/spectrumCompliance";
import {
  analyzeCompliance,
  COMPLIANCE_STANDARDS,
  formatViolationMessage,
  getComplianceColor,
} from "../utils/spectrumCompliance";
import Plot from "react-plotly.js";

interface SpectrumComplianceTabProps {
  analysis: AnalysisResult;
}

export default function SpectrumComplianceTab({ analysis }: SpectrumComplianceTabProps) {
  const [selectedStandard, setSelectedStandard] = useState<ComplianceStandard>("streaming");
  const [customNorms, setCustomNorms] = useState<ComplianceNorms | null>(null);
  const [editMode, setEditMode] = useState(false);

  const complianceResult = useMemo(() => {
    return analyzeCompliance(analysis.bands, selectedStandard, customNorms || undefined);
  }, [analysis.bands, selectedStandard, customNorms]);

  const handleNormChange = (bandKey: string, limit: "upper" | "lower", value: number) => {
    const updated = customNorms || { ...COMPLIANCE_STANDARDS[selectedStandard] };
    if (!updated[bandKey]) {
      updated[bandKey] = { upper: 3, lower: -3 };
    }
    updated[bandKey][limit] = value;
    setCustomNorms(updated);
  };

  // Prepare data for Plotly visualization
  const plotData = useMemo(() => {
    const x = complianceResult.norms ? Object.keys(complianceResult.norms) : [];
    const mixLevels = x.map((key) => {
      const band = analysis.bands.find(
        (b) => key.includes(b.name) || key.includes(String(b.center)),
      );
      return band?.differenceDb ?? 0;
    });

    const upperLimits = x.map((key) => complianceResult.norms[key]?.upper ?? 3);
    const lowerLimits = x.map((key) => complianceResult.norms[key]?.lower ?? -3);

    return [
      {
        x,
        y: upperLimits,
        name: "Upper Limit",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "rgba(200, 200, 200, 0.5)", width: 2, dash: "dash" as const },
      },
      {
        x,
        y: lowerLimits,
        name: "Lower Limit",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "rgba(200, 200, 200, 0.5)", width: 2, dash: "dash" as const },
      },
      {
        x,
        y: mixLevels,
        name: "Mix Level",
        type: "scatter" as const,
        mode: "lines+markers" as const,
        line: { color: "hsl(210, 100%, 50%)", width: 3 },
        marker: { size: 8 },
      },
    ];
  }, [complianceResult, analysis.bands]);

  const layout = {
    title: "Spectrum Compliance Analysis",
    xaxis: { title: "Frequency Band" },
    yaxis: { title: "Level (dB)" },
    hovermode: "x unified" as const,
    plot_bgcolor: "rgba(30, 30, 30, 0.5)",
    paper_bgcolor: "rgba(20, 20, 20, 1)",
    font: { color: "#ccc" },
  };

  return (
    <div className="compliance-panel">
      <div className="compliance-controls">
        <div className="control-group">
          <label htmlFor="standard-select">Standard:</label>
          <select
            id="standard-select"
            value={selectedStandard}
            onChange={(e) => {
              setSelectedStandard(e.target.value as ComplianceStandard);
              setCustomNorms(null);
              setEditMode(false);
            }}
            className="compliance-select"
          >
            <option value="streaming">Streaming (Spotify, YouTube, Apple Music)</option>
            <option value="radio">Radio (AM/FM Broadcast)</option>
            <option value="tv">TV / Broadcast (EBU R128)</option>
            <option value="custom">Custom Norms</option>
          </select>
        </div>

        {selectedStandard === "custom" && (
          <button
            className="button button-secondary"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Done Editing" : "Edit Norms"}
          </button>
        )}
      </div>

      {/* Compliance Status Summary */}
      <div className="compliance-summary">
        <h3>Status</h3>
        {complianceResult.isCompliant ? (
          <p className="compliance-pass">✓ Compliant with {selectedStandard} standards</p>
        ) : (
          <p className="compliance-fail">
            ✗ {complianceResult.violationCount} violation{complianceResult.violationCount !== 1 ? "s" : ""} detected
          </p>
        )}
      </div>

      {/* Visualization */}
      <div className="compliance-chart">
        <Plot data={plotData} layout={layout} style={{ width: "100%", height: "400px" }} />
      </div>

      {/* Violations List */}
      {complianceResult.violations.length > 0 && (
        <div className="violations-list">
          <h3>Violations</h3>
          <ul>
            {complianceResult.violations.map((violation, idx) => (
              <li key={idx} className="violation-item">
                <span className="violation-band">{violation.bandName}</span>
                <span className="violation-message">
                  {formatViolationMessage(violation)}
                </span>
                <span className="violation-detail">
                  Current: {violation.currentLevel.toFixed(1)} dB
                  (Limit: {violation.upperLimit} / {violation.lowerLimit} dB)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Edit Norms */}
      {editMode && (
        <div className="edit-norms-panel">
          <h3>Edit Custom Norms (±dB)</h3>
          <div className="norms-grid">
            {Object.entries(complianceResult.norms).map(([key, norm]) => (
              <div key={key} className="norm-item">
                <label>{key}</label>
                <div className="norm-inputs">
                  <input
                    type="number"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={norm.upper}
                    onChange={(e) => handleNormChange(key, "upper", parseFloat(e.target.value))}
                    placeholder="Upper"
                  />
                  <span>/</span>
                  <input
                    type="number"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={norm.lower}
                    onChange={(e) => handleNormChange(key, "lower", parseFloat(e.target.value))}
                    placeholder="Lower"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
