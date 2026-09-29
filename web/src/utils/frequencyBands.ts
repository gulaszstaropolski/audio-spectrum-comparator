import type { FrequencyBand } from "../types/audio";

export const FREQUENCY_BANDS = [
  { name: "Sub-bass", range: "20–60 Hz", low: 20, high: 60 },
  { name: "Bass", range: "60–250 Hz", low: 60, high: 250 },
  { name: "Low-Mid", range: "250–500 Hz", low: 250, high: 500 },
  { name: "Mid", range: "500 Hz–2 kHz", low: 500, high: 2000 },
  { name: "Upper-Mid", range: "2–4 kHz", low: 2000, high: 4000 },
  { name: "Presence", range: "4–8 kHz", low: 4000, high: 8000 },
  { name: "Brilliance", range: "8–16 kHz", low: 8000, high: 16000 },
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
