import type {
  AnalysisResult,
  ComplianceNorms,
  ComplianceResult,
  ComplianceStandard,
  ComplianceViolation,
} from "../types/audio";

const SQRT_TWO = Math.sqrt(2);

export const COMPLIANCE_BANDS = [
  { id: "31.5", name: "31.5 Hz", center: 31.5 },
  { id: "63", name: "63 Hz", center: 63 },
  { id: "125", name: "125 Hz", center: 125 },
  { id: "250", name: "250 Hz", center: 250 },
  { id: "500", name: "500 Hz", center: 500 },
  { id: "1000", name: "1 kHz", center: 1000 },
  { id: "2000", name: "2 kHz", center: 2000 },
  { id: "4000", name: "4 kHz", center: 4000 },
  { id: "8000", name: "8 kHz", center: 8000 },
  { id: "16000", name: "16 kHz", center: 16000 },
].map((band) => ({
  ...band,
  low: band.center / SQRT_TWO,
  high: band.center * SQRT_TWO,
  range: `${Math.round(band.center / SQRT_TWO)}–${Math.round(band.center * SQRT_TWO)} Hz`,
}));

function makeNorms(lower: number[], upper: number[]): ComplianceNorms {
  return Object.fromEntries(
    COMPLIANCE_BANDS.map((band, index) => [
      band.id,
      { lowerDb: lower[index], upperDb: upper[index] },
    ]),
  );
}

export const COMPLIANCE_STANDARDS: Record<Exclude<ComplianceStandard, "Custom">, ComplianceNorms> = {
  Streaming: makeNorms(
    [-3, -3, -3, -3, -3, -3, -3, -3, -3, -3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  ),
  Radio: makeNorms(
    [-5, -3, -3, -2, -2, -2, -2, -3, -4, -6],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  ),
  "TV/Broadcast": makeNorms(
    [-6, -4, -3, -2, -2, -2, -2, -3, -5, -8],
    [1, 1, 2, 2, 2, 2, 2, 2, 1, 0],
  ),
};

export function analyzeCompliance(
  analysis: Pick<AnalysisResult, "frequencies" | "differenceDb">,
  standard: ComplianceStandard,
  norms: ComplianceNorms,
): ComplianceResult {
  const bands = COMPLIANCE_BANDS.map((band) => {
    const norm = norms[band.id] ?? { lowerDb: -3, upperDb: 3 };
    let sum = 0;
    let count = 0;
    analysis.frequencies.forEach((frequency, index) => {
      if (frequency >= band.low && frequency < band.high) {
        sum += analysis.differenceDb[index] ?? 0;
        count += 1;
      }
    });
    const differenceDb = count ? sum / count : 0;
    return {
      id: band.id,
      name: band.name,
      range: band.range,
      differenceDb,
      lowerDb: norm.lowerDb,
      upperDb: norm.upperDb,
      status: differenceDb > norm.upperDb
        ? "above" as const
        : differenceDb < norm.lowerDb
          ? "below" as const
          : "within" as const,
    };
  });
  const violations = bands.flatMap((band): ComplianceViolation[] => {
    if (band.status === "above") {
      return [{
        band: band.name,
        range: band.range,
        differenceDb: band.differenceDb,
        limitDb: band.upperDb,
        direction: "above",
        amountDb: band.differenceDb - band.upperDb,
      }];
    }
    if (band.status === "below") {
      return [{
        band: band.name,
        range: band.range,
        differenceDb: band.differenceDb,
        limitDb: band.lowerDb,
        direction: "below",
        amountDb: band.lowerDb - band.differenceDb,
      }];
    }
    return [];
  });
  return { standard, bands, violations };
}

export function formatViolationMessage(violation: ComplianceViolation): string {
  const amount = violation.amountDb.toFixed(1);
  return violation.direction === "above"
    ? `+${amount} dB powyżej limitu w ${violation.range}`
    : `−${amount} dB poniżej limitu w ${violation.range}`;
}

export function getComplianceColor(status: "within" | "above" | "below"): string {
  if (status === "above") return "#ee685d";
  if (status === "below") return "#70aefa";
  return "#4caf6a";
}
