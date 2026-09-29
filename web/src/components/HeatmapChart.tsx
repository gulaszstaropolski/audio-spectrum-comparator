import Plot from "./Plot";
import type { AnalysisResult } from "../types/audio";

export default function HeatmapChart({
  analysis,
}: {
  analysis: AnalysisResult;
}) {
  return (
    <div className="chart-frame" id="heatmap-chart">
      <Plot
        data={[
          {
            type: "heatmap",
            x: analysis.times,
            y: analysis.heatmapFrequencies,
            z: analysis.heatmapValues,
            colorscale: [
              [0, "#367cc8"],
              [0.5, "#17212d"],
              [1, "#ee685d"],
            ],
            zmin: -12,
            zmax: 12,
            zmid: 0,
            colorbar: { title: { text: "Difference (dB)" }, ticksuffix: " dB" },
            hovertemplate:
              "Time: %{x:.2f} s<br>Frequency: %{y:.1f} Hz<br>Difference: %{z:.2f} dB<extra></extra>",
          },
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "#a8b4c3", family: "Inter, sans-serif" },
          margin: { l: 68, r: 20, t: 16, b: 56 },
          xaxis: { title: { text: "Time (seconds)" }, gridcolor: "#283342", zeroline: false },
          yaxis: {
            title: { text: "Frequency (Hz)" },
            type: "log",
            range: [Math.log10(20), Math.log10(20000)],
            gridcolor: "#283342",
            zeroline: false,
          },
          uirevision: "spectrum-heatmap",
        }}
        config={{ responsive: true, displaylogo: false, scrollZoom: true }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
