import Plot from "./Plot";
import type { AnalysisResult } from "../types/audio";

export default function SpectrumChart({
  analysis,
}: {
  analysis: AnalysisResult;
}) {
  return (
    <div className="chart-frame" id="spectrum-chart">
      <Plot
        data={[
          {
            type: "scatter",
            mode: "lines",
            name: "Reference",
            x: analysis.frequencies,
            y: analysis.referenceSpectrum,
            line: { color: "#5a9cf5", width: 2 },
            hovertemplate: "Reference<br>%{x:.1f} Hz<br>%{y:.2f} dBFS<extra></extra>",
          },
          {
            type: "scatter",
            mode: "lines",
            name: "Mix",
            x: analysis.frequencies,
            y: analysis.mixSpectrum,
            line: { color: "#f07065", width: 2 },
            hovertemplate: "Mix<br>%{x:.1f} Hz<br>%{y:.2f} dBFS<extra></extra>",
          },
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "#a8b4c3", family: "Inter, sans-serif" },
          margin: { l: 68, r: 22, t: 16, b: 56 },
          xaxis: {
            title: { text: "Frequency (Hz)" },
            type: "log",
            range: [Math.log10(20), Math.log10(20000)],
            gridcolor: "#283342",
            zeroline: false,
          },
          yaxis: { title: { text: "Level (dBFS)" }, gridcolor: "#283342", zeroline: false },
          legend: { orientation: "h", y: 1.12, x: 0 },
          uirevision: "spectrum-overlay",
        }}
        config={{ responsive: true, displaylogo: false, scrollZoom: true }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
