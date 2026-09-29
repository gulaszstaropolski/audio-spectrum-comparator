import Plot from "./Plot";
import type { EqCorrectionBand } from "../types/audio";

// Compact "1.2k" style Hz label used on the graph's exact-parameter markers,
// so the axis stays readable even for the highest bands (e.g. 12000 Hz).
function formatHz(frequency: number): string {
  return frequency >= 1000
    ? `${(frequency / 1000).toFixed(frequency % 1000 === 0 ? 0 : 1)}k`
    : String(frequency);
}

export default function CorrectionChart({
  corrections,
}: {
  corrections: EqCorrectionBand[];
}) {
  const names = corrections.map((band) => band.name);
  const gains = corrections.map((band) => band.correctionDb);
  // Positional indices used by the hovertemplate below — plotly.js only
  // supports "%{customdata[N]}" array access in hovertemplate strings, not
  // "%{customdata.fieldName}" object property access, so we document the
  // index -> field mapping here explicitly instead of using "magic numbers".
  const CUSTOMDATA_FREQUENCY = 0;
  const CUSTOMDATA_Q = 1;
  const CUSTOMDATA_TYPE = 2;
  const CUSTOMDATA_STATE = 3;
  const CUSTOMDATA_RANGE = 4;
  const customdata: (number | string)[][] = corrections.map((band) => [
    band.center,
    band.q,
    band.eqType,
    band.bypass ? "Bypassed" : "Active",
    band.range,
  ]);
  // Exact correction points (frequency + gain + Q), shown as markers on top
  // of the bars so the graph communicates the specific band settings that
  // will be entered in the EQ plugin, not just the "from-to" band range.
  const pointLabels = corrections.map(
    (band) => `${formatHz(band.center)}Hz · Q${band.q.toFixed(1)}`,
  );
  return (
    <div className="chart-frame" id="correction-chart">
      <Plot
        data={[
          {
            type: "bar",
            x: names,
            y: gains,
            marker: {
              color: gains.map((gain) => (gain >= 0 ? "#4caf6a" : "#ee685d")),
            },
            text: gains.map((gain) => `${gain >= 0 ? "+" : ""}${gain.toFixed(1)} dB`),
            textposition: "outside",
            cliponaxis: false,
            customdata,
            hovertemplate:
              `<b>%{x}</b> (%{customdata[${CUSTOMDATA_RANGE}]})<br>Frequency: %{customdata[${CUSTOMDATA_FREQUENCY}]} Hz<br>Correction: %{y:+.2f} dB<br>` +
              `Q: %{customdata[${CUSTOMDATA_Q}]}<br>Type: %{customdata[${CUSTOMDATA_TYPE}]}<br>%{customdata[${CUSTOMDATA_STATE}]}<extra></extra>`,
          },
          {
            type: "scatter",
            mode: "markers+text",
            x: names,
            y: gains,
            marker: {
              size: 10,
              symbol: "diamond",
              color: gains.map((gain) => (gain >= 0 ? "#4caf6a" : "#ee685d")),
              line: { color: "#0f1620", width: 1.5 },
            },
            text: pointLabels,
            textposition: gains.map((gain) => (gain >= 0 ? "top center" : "bottom center")),
            textfont: { size: 10, color: "#a8b4c3" },
            hoverinfo: "skip",
            showlegend: false,
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
