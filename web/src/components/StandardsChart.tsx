import type { AnalysisResult } from "../types/audio";

const COMPLIANCE_THRESHOLD_DB = 5;
const OCTAVE_RATIO = Math.SQRT2;
const STANDARD_BANDS = [
  { frequency: 31.5, label: "Sub Bass" },
  { frequency: 63, label: "Deep Bass" },
  { frequency: 125, label: "Bass" },
  { frequency: 250, label: "Low Mid" },
  { frequency: 500, label: "Midrange" },
  { frequency: 1000, label: "Vocal" },
  { frequency: 2000, label: "Upper Mid" },
  { frequency: 4000, label: "Presence" },
  { frequency: 8000, label: "Brilliance" },
  { frequency: 16000, label: "Air" },
] as const;
const LOUDNESS_TARGETS = [
  { platform: "Spotify", target: "−14 LUFS" },
  { platform: "YouTube", target: "−14 LUFS" },
  { platform: "Apple Music", target: "−16 LUFS" },
  { platform: "Broadcast (EBU R128)", target: "−23 LUFS" },
] as const;

function formatFrequency(frequency: number): string {
  return frequency >= 1000
    ? `${frequency / 1000} kHz`
    : `${frequency} Hz`;
}

function getBandDifference(
  analysis: AnalysisResult,
  centerFrequency: number,
): number | null {
  const low = centerFrequency / OCTAVE_RATIO;
  const high = centerFrequency * OCTAVE_RATIO;
  let sum = 0;
  let count = 0;

  analysis.frequencies.forEach((frequency, index) => {
    if (frequency >= low && frequency < high) {
      sum += analysis.differenceDb[index];
      count += 1;
    }
  });

  return count ? sum / count : null;
}

export default function StandardsChart({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="standards-view">
      <section className="standards-section">
        <div className="standards-heading">
          <h3>ISO octave bands</h3>
          <span>Mix vs reference · ±{COMPLIANCE_THRESHOLD_DB} dB tolerance</span>
        </div>
        <div className="standards-legend" aria-label="Compliance legend">
          <span><i className="status-dot compliant" /> Within tolerance</span>
          <span><i className="status-dot exceeds" /> Exceeds tolerance</span>
          <span><i className="status-dot unavailable" /> No analysis bins</span>
          <span><i className="tolerance-key" /> Acceptable range</span>
        </div>
        <div className="standards-table-scroll">
          <table className="standards-table">
            <thead>
              <tr>
                <th>Band</th>
                <th>Frequency</th>
                <th>Mix − reference</th>
                <th>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {STANDARD_BANDS.map((band) => {
                const difference = getBandDifference(analysis, band.frequency);
                const status =
                  difference === null
                    ? "unavailable"
                    : Math.abs(difference) <= COMPLIANCE_THRESHOLD_DB
                      ? "compliant"
                      : "exceeds";

                return (
                  <tr key={band.frequency}>
                    <td>{band.label}</td>
                    <td>{formatFrequency(band.frequency)}</td>
                    <td className={`standards-value ${status}`}>
                      {difference === null
                        ? "—"
                        : `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} dB`}
                    </td>
                    <td>
                      <span className={`compliance-status ${status}`}>
                        {status === "compliant"
                          ? "Compliant"
                          : status === "exceeds"
                            ? "Exceeds ±5 dB"
                            : "Unavailable"}
                      </span>
                      {difference !== null && (
                        <span
                          className="compliance-track"
                          role="img"
                          aria-label={`${band.label}: ${difference >= 0 ? "+" : ""}${difference.toFixed(1)} dB; acceptable range is ±${COMPLIANCE_THRESHOLD_DB} dB`}
                        >
                          <i
                            className={`compliance-marker ${status}`}
                            style={{
                              left: `${50 + Math.max(-10, Math.min(10, difference)) * 2.5}%`,
                            }}
                          />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="chart-note">
          Each value is the average mix-minus-reference difference within the band’s octave.
          The gray span marks ±{COMPLIANCE_THRESHOLD_DB} dB; no bins are shown as unavailable.
        </p>
      </section>

      <section className="standards-section loudness-section">
        <div className="standards-heading">
          <h3>LUFS loudness targets</h3>
          <span>Industry reference values</span>
        </div>
        <div className="loudness-grid">
          {LOUDNESS_TARGETS.map((target) => (
            <article className="loudness-card" key={target.platform}>
              <span>{target.platform}</span>
              <strong>{target.target}</strong>
            </article>
          ))}
          <article className="loudness-card">
            <span>True peak limit</span>
            <strong>−1 dBTP</strong>
          </article>
        </div>
        <p className="chart-note">
          These are reference targets. This analyzer compares frequency balance and does not
          measure integrated LUFS or true peak.
        </p>
      </section>
    </div>
  );
}
