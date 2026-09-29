import Plot from "./Plot";
import type { EqCorrectionBand } from "../types/audio";

export default function CorrectionChart({
  corrections,
}: {
  corrections: EqCorrectionBand[];
}) {
  return (
    <div className="chart-frame" id="correction-chart">
      <Plot
        data={[
          {
            type: "bar",
            x: corrections.map((band) => band.name),
            y: corrections.map((band) => band.correctionDb),
            marker: {
              color: corrections.map((band) =>
                band.correctionDb >= 0 ? "#4caf6a" : "#ee685d",
              ),
            },
            text: corrections.map(
              (band) => `${band.correctionDb >= 0 ? "+" : ""}${band.correctionDb.toFixed(1)} dB`,
            ),
            textposition: "outside",
            cliponaxis: false,
            customdata: corrections.map((band) => band.range),
            hovertemplate:
              "%{x}<br>%{customdata}<br>Correction: %{y:+.2f} dB<extra></extra>",
          },
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "#a8b4c3", family: "Inter, sans-serif" },
          margin: { l: 65, r: 20, t: 28, b: 70 },
          xaxis: { gridcolor: "#283342", zeroline: false },
          yaxis: {
            title: { text: "Suggested correction (dB)" },
            gridcolor: "#283342",
            zeroline: true,
            zerolinecolor: "#6e7c8e",
          },
          uirevision: "eq-correction",
        }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
