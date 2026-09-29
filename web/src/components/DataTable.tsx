import type { AnalysisResult } from "../types/audio";

export default function DataTable({
  analysis,
}: {
  analysis: AnalysisResult;
}) {
  return (
    <div className="table-scroll" aria-label="Numerical spectrum data">
      <table>
        <thead>
          <tr>
            <th>Frequency</th>
            <th>Reference</th>
            <th>Mix</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          {analysis.frequencies.map((frequency, index) => {
            const difference = analysis.differenceDb[index];
            return (
              <tr key={frequency}>
                <td>{frequency.toFixed(2)} Hz</td>
                <td>{analysis.referenceSpectrum[index].toFixed(2)} dBFS</td>
                <td>{analysis.mixSpectrum[index].toFixed(2)} dBFS</td>
                <td className={difference >= 0 ? "value-positive" : "value-negative"}>
                  {difference >= 0 ? "+" : ""}
                  {difference.toFixed(2)} dB
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
