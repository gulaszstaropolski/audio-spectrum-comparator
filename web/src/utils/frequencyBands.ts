import type { EqCorrectionBand, FrequencyBand } from "../types/audio";

// Corrections larger than this are considered extreme for a musical EQ move.
export const EXTREME_CORRECTION_DB = 12;

// Standard parametric EQ settings per band: a musical Q of ~0.7 keeps the
// correction broad enough to sound natural, and "Peaking" is the filter
// type supported by essentially every VST EQ (ReaEQ, FabFilter Pro-Q, ...).
export const FREQUENCY_BANDS = [
  { name: "Sub-bass", range: "20–60 Hz", low: 20, high: 60, center: 40, q: 0.7, eqType: "Peaking" },
  { name: "Bass", range: "60–250 Hz", low: 60, high: 250, center: 100, q: 0.7, eqType: "Peaking" },
  { name: "Low-Mid", range: "250–500 Hz", low: 250, high: 500, center: 350, q: 0.7, eqType: "Peaking" },
  { name: "Mid", range: "500 Hz–2 kHz", low: 500, high: 2000, center: 1000, q: 0.7, eqType: "Peaking" },
  { name: "Upper-Mid", range: "2–4 kHz", low: 2000, high: 4000, center: 3000, q: 0.7, eqType: "Peaking" },
  { name: "Presence", range: "4–8 kHz", low: 4000, high: 8000, center: 6000, q: 0.7, eqType: "Peaking" },
  { name: "Brilliance", range: "8–16 kHz", low: 8000, high: 16000, center: 12000, q: 0.7, eqType: "Peaking" },
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
  return bands.map((band) => ({
    name: band.name,
    range: band.range,
    center: band.center,
    q: band.q,
    eqType: band.eqType,
    correctionDb: -band.differenceDb,
  }));
}
