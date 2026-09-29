import type { EqCorrectionBand, FrequencyBand } from "../types/audio";

// Corrections larger than this are considered extreme for a musical EQ move.
export const EXTREME_CORRECTION_DB = 12;

// Corrections smaller than this are treated as "no meaningful change" and the
// band is marked as bypassed in exported presets, since applying a fraction
// of a dB of correction is inaudible and just adds clutter to the preset.
export const BYPASS_THRESHOLD_DB = 0.1;

// Standard parametric EQ settings per band. Each band gets its own musical Q:
// wider (lower Q) for the extreme low/high ends where broad, gentle moves
// sound natural, and narrower (higher Q) around the upper-mids/presence
// range where more surgical corrections are typically needed. "Peaking"
// (a.k.a. "Bell") is the filter type supported by essentially every VST EQ
// (ReaEQ, FabFilter Pro-Q, PreSonus Pro EQ, ...).
export const FREQUENCY_BANDS = [
  // Q 0.7 — wide: gentle, broad low-end moves stay musical.
  { name: "Sub-bass", range: "20–60 Hz", low: 20, high: 60, center: 40, q: 0.7, eqType: "Peaking" },
  // Q 0.8 — wide: still broad, slightly tighter than sub-bass.
  { name: "Bass", range: "60–250 Hz", low: 60, high: 250, center: 100, q: 0.8, eqType: "Peaking" },
  // Q 1.0 — moderate: balances warmth control with precision.
  { name: "Low-Mid", range: "250–500 Hz", low: 250, high: 500, center: 350, q: 1.0, eqType: "Peaking" },
  // Q 1.2 — moderate-narrow: keeps vocal/instrument fundamentals precise.
  { name: "Mid", range: "500 Hz–2 kHz", low: 500, high: 2000, center: 1000, q: 1.2, eqType: "Peaking" },
  // Q 1.5 — narrower: targets harshness/presence without affecting neighbors.
  { name: "Upper-Mid", range: "2–4 kHz", low: 2000, high: 4000, center: 3000, q: 1.5, eqType: "Peaking" },
  { name: "Presence", range: "4–8 kHz", low: 4000, high: 8000, center: 6000, q: 1.5, eqType: "Peaking" },
  // Q 1.0 — wide: air/brilliance responds well to a broader shelf-like bell.
  { name: "Brilliance", range: "8–16 kHz", low: 8000, high: 16000, center: 12000, q: 1.0, eqType: "Peaking" },
] as const;

export function calculateBandDifferences(
  frequencies: number[],
  differenceDb: number[],
): FrequencyBand[] {
  return FREQUENCY_BANDS.map((band) => {
    let sum = 0;
    let count = 0;
    frequencies.forEach((frequency, index) => {
      if (frequency >= band.low && frequency < band.high) {
        sum += differenceDb[index];
        count += 1;
      }
    });
    return {
      ...band,
      differenceDb: count ? sum / count : 0,
    };
  });
}

// Correction to apply on the mix to bring it closer to the reference:
// a positive value means "boost" (lift) this band, a negative value means
// "cut". Since differenceDb is mix − reference, the correction is the
// inverse: reference − mix.
export function calculateEqCorrections(bands: FrequencyBand[]): EqCorrectionBand[] {
  return bands.map((band) => {
    const correctionDb = -band.differenceDb;
    return {
      name: band.name,
      range: band.range,
      center: band.center,
      q: band.q,
      eqType: band.eqType,
      correctionDb,
      bypass: Math.abs(correctionDb) < BYPASS_THRESHOLD_DB,
      exceedsThreshold: Math.abs(correctionDb) > EXTREME_CORRECTION_DB,
    };
  });
}
