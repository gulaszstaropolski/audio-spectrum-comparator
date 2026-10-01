import type { FrequencyBand } from "../types/audio";

export type ComplianceStandard = "streaming" | "radio" | "tv" | "custom";

export type ComplianceNorms = Record<string, { upper: number; lower: number }>;

export type ComplianceViolation = {
  bandName: string;
  bandRange: string;
  centerFreq: number;
  currentLevel: number;
  upperLimit: number;
  lowerLimit: number;
  violationType: "above" | "below" | null;
  violationAmount: number; // positive = how much above/below
};

export type ComplianceResult = {
  standard: ComplianceStandard;
  norms: ComplianceNorms;
  violations: ComplianceViolation[];
  isCompliant: boolean;
  violationCount: number;
};

/**
 * ISO 10-Band Octave Standards for Different Platforms
 * ±3 dB tolerance per band as industry standard
 */
export const COMPLIANCE_STANDARDS: Record<ComplianceStandard, ComplianceNorms> = {
  streaming: {
    "Sub-bass (31.5 Hz)": { upper: 3, lower: -3 },
    "Deep Bass (63 Hz)": { upper: 3, lower: -3 },
    "Bass (125 Hz)": { upper: 3, lower: -3 },
    "Low-Mid (250 Hz)": { upper: 3, lower: -3 },
    "Midrange (500 Hz)": { upper: 3, lower: -3 },
    "Vocal (1 kHz)": { upper: 3, lower: -3 },
    "Upper-Mid (2 kHz)": { upper: 3, lower: -3 },
    "Presence (4 kHz)": { upper: 3, lower: -3 },
    "Brilliance (8 kHz)": { upper: 3, lower: -3 },
    "Air (16 kHz)": { upper: 3, lower: -3 },
  },
  radio: {
    // Radio typically needs tighter mid range, reduced extremes
    "Sub-bass (31.5 Hz)": { upper: 2, lower: -5 },
    "Deep Bass (63 Hz)": { upper: 2, lower: -3 },
    "Bass (125 Hz)": { upper: 3, lower: -2 },
    "Low-Mid (250 Hz)": { upper: 3, lower: -3 },
    "Midrange (500 Hz)": { upper: 2, lower: -2 },
    "Vocal (1 kHz)": { upper: 2, lower: -2 },
    "Upper-Mid (2 kHz)": { upper: 2, lower: -2 },
    "Presence (4 kHz)": { upper: 3, lower: -3 },
    "Brilliance (8 kHz)": { upper: 2, lower: -4 },
    "Air (16 kHz)": { upper: 1, lower: -6 },
  },
  tv: {
    // TV/Broadcast (EBU R128 influenced) - more conservative
    "Sub-bass (31.5 Hz)": { upper: 1, lower: -6 },
    "Deep Bass (63 Hz)": { upper: 2, lower: -4 },
    "Bass (125 Hz)": { upper: 2, lower: -3 },
    "Low-Mid (250 Hz)": { upper: 2, lower: -3 },
    "Midrange (500 Hz)": { upper: 2, lower: -2 },
    "Vocal (1 kHz)": { upper: 2, lower: -2 },
    "Upper-Mid (2 kHz)": { upper: 2, lower: -2 },
    "Presence (4 kHz)": { upper: 2, lower: -3 },
    "Brilliance (8 kHz)": { upper: 1, lower: -4 },
    "Air (16 kHz)": { upper: 0, lower: -8 },
  },
  custom: {
    // Defaults to streaming, can be modified
    "Sub-bass (31.5 Hz)": { upper: 3, lower: -3 },
    "Deep Bass (63 Hz)": { upper: 3, lower: -3 },
    "Bass (125 Hz)": { upper: 3, lower: -3 },
    "Low-Mid (250 Hz)": { upper: 3, lower: -3 },
    "Midrange (500 Hz)": { upper: 3, lower: -3 },
    "Vocal (1 kHz)": { upper: 3, lower: -3 },
    "Upper-Mid (2 kHz)": { upper: 3, lower: -3 },
    "Presence (4 kHz)": { upper: 3, lower: -3 },
    "Brilliance (8 kHz)": { upper: 3, lower: -3 },
    "Air (16 kHz)": { upper: 3, lower: -3 },
  },
};

/**
 * Map band names from FREQUENCY_BANDS to compliance standard keys
 */
export const BAND_TO_COMPLIANCE_KEY: Record<string, string> = {
  "Sub-bass": "Sub-bass (31.5 Hz)",
  "Bass": "Deep Bass (63 Hz)",
  "Low-Mid": "Low-Mid (250 Hz)",
  "Mid": "Midrange (500 Hz)",
  "Upper-Mid": "Upper-Mid (2 kHz)",
  "Presence": "Presence (4 kHz)",
  "Brilliance": "Brilliance (8 kHz)",
};

/**
 * Analyze bands against compliance norms
 */
export function analyzeCompliance(
  bands: FrequencyBand[],
  standard: ComplianceStandard,
  customNorms?: ComplianceNorms,
): ComplianceResult {
  const norms = customNorms || COMPLIANCE_STANDARDS[standard];
  const violations: ComplianceViolation[] = [];

  bands.forEach((band) => {
    const complianceKey = BAND_TO_COMPLIANCE_KEY[band.name];
    if (!complianceKey) return; // Skip if band not in mapping

    const norm = norms[complianceKey];
    if (!norm) return;

    const { upper, lower } = norm;
    const currentLevel = band.differenceDb;

    let violationType: "above" | "below" | null = null;
    let violationAmount = 0;

    if (currentLevel > upper) {
      violationType = "above";
      violationAmount = currentLevel - upper;
    } else if (currentLevel < lower) {
      violationType = "below";
      violationAmount = Math.abs(currentLevel - lower);
    }

    if (violationType) {
      violations.push({
        bandName: band.name,
        bandRange: band.range,
        centerFreq: band.center,
        currentLevel,
        upperLimit: upper,
        lowerLimit: lower,
        violationType,
        violationAmount,
      });
    }
  });

  return {
    standard,
    norms,
    violations,
    isCompliant: violations.length === 0,
    violationCount: violations.length,
  };
}

/**
 * Format violation message for UI display
 */
export function formatViolationMessage(violation: ComplianceViolation): string {
  if (violation.violationType === "above") {
    return `+${violation.violationAmount.toFixed(1)} dB powyżej w ${violation.bandRange}`;
  } else if (violation.violationType === "below") {
    return `-${violation.violationAmount.toFixed(1)} dB poniżej w ${violation.bandRange}`;
  }
  return "";
}

/**
 * Get color for compliance visualization
 */
export function getComplianceColor(violation: ComplianceViolation | null): string {
  if (!violation) return "hsl(0, 0%, 50%)"; // Gray for in-spec
  return violation.violationType === "above" ? "hsl(0, 100%, 50%)" : "hsl(210, 100%, 50%)"; // Red above, blue below
}
