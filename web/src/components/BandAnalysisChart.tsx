import Plot from "./Plot";
import type { AnalysisResult } from "../types/audio";

export default function BandAnalysisChart({
  analysis,
}: {
  analysis: AnalysisResult;
}) {
  return (
    <div className="chart-frame" id="band-chart">
      <Plot
        data={[
          {
            type: "bar",
            x: analysis.bands.map((band) => band.name),
            y: analysis.bands.map((band) => band.differenceDb),
            marker: {
              color: analysis.bands.map((band) =>
                band.differenceDb >= 0 ? "#ee685d" : "#4e95e5",
              ),
            },
            text: analysis.bands.map(
              (band) => `${band.differenceDb >= 0 ? "+" : ""}${band.differenceDb.toFixed(1)} dB`,
            ),
            textposition: "outside",
            cliponaxis: false,
            customdata: analysis.bands.map((band) => band.range),
            hovertemplate:
              "%{x}<br>%{customdata}<br>Mix vs reference: %{y:+.2f} dB<extra></extra>",
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
            title: { text: "Mix − reference (dB)" },
            gridcolor: "#283342",
            zeroline: true,
            zerolinecolor: "#6e7c8e",
          },
          uirevision: "spectrum-bands",
        }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
