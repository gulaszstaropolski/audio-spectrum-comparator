// 31-band graphic EQ utilities: 1/3-octave ISO center frequencies, the
// per-band filter math used to preview a correction curve, and the live
// "corrected mix" spectrum calculation shown in the EQ Correction tab.

// Standard ISO 1/3-octave center frequencies from 20 Hz to 20 kHz.
export const EQ_31_CENTER_FREQUENCIES = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
  12500, 16000, 20000,
] as const;

export const EQ_31_BAND_COUNT = EQ_31_CENTER_FREQUENCIES.length;

// ±12 dB is the conventional range of a graphic EQ fader.
export const EQ_31_MAX_GAIN_DB = 12;

// Q for a 1/3-octave peaking bell so adjacent bands overlap smoothly,
// matching the classic graphic-EQ "constant Q" response.
export const EQ_31_BAND_Q = 4.318;

// Human-friendly label for a center frequency, e.g. 1000 -> "1k", 12500 -> "12.5k".
export function formatEq31Label(frequency: number): string {
  if (frequency >= 1000) {
    const kilohertz = frequency / 1000;
    const rounded = Math.round(kilohertz * 100) / 100;
    return `${rounded}k`;
  }
  return frequency % 1 === 0 ? String(frequency) : frequency.toFixed(1);
}

export function createDefaultEq31Gains(): number[] {
  return new Array(EQ_31_BAND_COUNT).fill(0);
}

export function clampEq31Gain(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(EQ_31_MAX_GAIN_DB, Math.max(-EQ_31_MAX_GAIN_DB, value));
}

// RBJ Audio EQ Cookbook peaking-filter magnitude response, in dB, at
// `frequency` for a peaking (bell) filter centered at `centerFrequency` with
// the given `gainDb` and `q`, sampled at `sampleRate`. This mirrors the math
// a BiquadFilterNode(type: "peaking") applies, so the on-screen "corrected
// mix" curve matches what the live audio preview actually plays.
function peakingResponseDb(
  frequency: number,
  centerFrequency: number,
  gainDb: number,
  q: number,
  sampleRate: number,
): number {
  if (gainDb === 0 || frequency <= 0 || frequency >= sampleRate / 2) return 0;

  const amplitude = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * centerFrequency) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cosW0 = Math.cos(w0);

  const b0 = 1 + alpha * amplitude;
  const b1 = -2 * cosW0;
  const b2 = 1 - alpha * amplitude;
  const a0 = 1 + alpha / amplitude;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha / amplitude;

  const w = (2 * Math.PI * frequency) / sampleRate;
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cos2W = Math.cos(2 * w);
  const sin2W = Math.sin(2 * w);

  const numReal = b0 + b1 * cosW + b2 * cos2W;
  const numImag = -(b1 * sinW + b2 * sin2W);
  const denReal = a0 + a1 * cosW + a2 * cos2W;
  const denImag = -(a1 * sinW + a2 * sin2W);

  const numMagnitude = Math.hypot(numReal, numImag);
  const denMagnitude = Math.hypot(denReal, denImag) || 1e-12;

  return 20 * Math.log10(numMagnitude / denMagnitude);
}

// Total correction (in dB) applied at `frequency` by the full 31-band chain.
export function totalEq31CorrectionDb(
  frequency: number,
  gains: number[],
  sampleRate: number,
): number {
  let total = 0;
  for (let index = 0; index < EQ_31_CENTER_FREQUENCIES.length; index += 1) {
    const gainDb = gains[index] ?? 0;
    if (!gainDb) continue;
    total += peakingResponseDb(
      frequency,
      EQ_31_CENTER_FREQUENCIES[index],
      gainDb,
      EQ_31_BAND_Q,
      sampleRate,
    );
  }
  return total;
}

// Half-width (in octaves) of a 1/3-octave band, used to derive each band's
// low/high edges from its ISO center frequency: center * 2^(±1/6).
const EQ_31_BAND_EDGE_RATIO = Math.pow(2, 1 / 6);

// Ideal per-band correction (in dB) to bring the mix spectrum fully in line
// with the reference spectrum — i.e. the gain each of the 31 sliders would
// need at 100% on the Master Slider. For each band, averages
// `referenceSpectrum - mixSpectrum` (mirroring `calculateEqCorrections`'s
// reference-minus-mix convention) over the bins within that band's
// 1/3-octave edges, falling back to the single closest bin when a band has
// no bins of its own (can happen for the outermost bands on a coarse FFT).
// Results are clamped to the slider range so Master Slider math and manual
// sliders always agree on what's achievable.
//
// `frequencies` is a monotonically increasing spectrum axis and
// `EQ_31_CENTER_FREQUENCIES` is sorted ascending too, so a single pass over
// `frequencies` (tracking a sliding low/high window per band) is enough —
// O(N + bands) instead of re-scanning the whole spectrum for every band.
export function calculateIdealEq31Gains(
  frequencies: number[],
  mixSpectrum: number[],
  referenceSpectrum: number[],
): number[] {
  const gains = new Array<number>(EQ_31_CENTER_FREQUENCIES.length).fill(0);
  let index = 0;

  for (let bandIndex = 0; bandIndex < EQ_31_CENTER_FREQUENCIES.length; bandIndex += 1) {
    const center = EQ_31_CENTER_FREQUENCIES[bandIndex];
    const low = center / EQ_31_BAND_EDGE_RATIO;
    const high = center * EQ_31_BAND_EDGE_RATIO;
    let sum = 0;
    let count = 0;
    let closestIndex = -1;
    let closestDistance = Infinity;

    // Skip forward past any bins before this band's edges (safe to do
    // permanently since both frequencies and band centers only increase).
    while (index < frequencies.length && frequencies[index] < low) {
      index += 1;
    }

    let scanIndex = index;
    while (scanIndex < frequencies.length && frequencies[scanIndex] < high) {
      sum += referenceSpectrum[scanIndex] - mixSpectrum[scanIndex];
      count += 1;
      scanIndex += 1;
    }

    if (count === 0) {
      // No bins fell within this band's edges (common for the outermost
      // bands on a coarse FFT): `index` is the first bin at/after `low`, so
      // the closest candidates are that bin and the one just before it.
      for (const probe of [index - 1, index]) {
        if (probe < 0 || probe >= frequencies.length) continue;
        const distance = Math.abs(frequencies[probe] - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = probe;
        }
      }
    }

    const averageDb =
      count > 0
        ? sum / count
        : closestIndex >= 0
          ? referenceSpectrum[closestIndex] - mixSpectrum[closestIndex]
          : 0;
    gains[bandIndex] = clampEq31Gain(averageDb);
  }

  return gains;
}

// Applies the 31-band correction curve on top of an existing dB spectrum,
// returning a new array the same length as `spectrumDb`/`frequencies`.
// Bands left at 0 dB are filtered out once up front (instead of re-checking
// per frequency bin inside the hot loop), since most sliders are usually
// untouched and spectra/frequency arrays can have thousands of bins.
export function applyEq31Correction(
  frequencies: number[],
  spectrumDb: number[],
  gains: number[],
  sampleRate: number,
): number[] {
  const activeBands: { center: number; gainDb: number }[] = [];
  for (let index = 0; index < EQ_31_CENTER_FREQUENCIES.length; index += 1) {
    const gainDb = gains[index] ?? 0;
    if (gainDb !== 0) activeBands.push({ center: EQ_31_CENTER_FREQUENCIES[index], gainDb });
  }

  if (!activeBands.length) return spectrumDb.slice();

  return spectrumDb.map((value, index) => {
    const frequency = frequencies[index];
    let correction = 0;
    for (const band of activeBands) {
      correction += peakingResponseDb(frequency, band.center, band.gainDb, EQ_31_BAND_Q, sampleRate);
    }
    return value + correction;
  });
}
