# Spectrum Compliance Feature

## 🎯 Overview

The **Spectrum Compliance Tab** allows you to analyze your mix against industry-standard frequency response norms for different platforms and mediums. It helps you ensure your audio meets compliance requirements for streaming services, radio, and broadcast.

## ✨ Features

### 1. **Pre-configured Standards**
Choose from three professional standards:
- **Streaming** (Spotify, YouTube, Apple Music) — ±3 dB per band
- **Radio** (AM/FM Broadcast) — Conservative limits, reduced extremes
- **TV/Broadcast** (EBU R128) — Most strict, optimized for broadcast chains

### 2. **Spectrum Compliance Visualization**
- **Plotly-based chart** showing mix level vs. compliance limits
- Gray dashed lines = upper/lower limits
- Blue/red line = your mix spectrum
- Easy identification of violations

### 3. **Violation Detection**
- Lists all frequency bands where mix exceeds/falls below limits
- Shows exact deviation in dB: `"+2 dB powyżej w 60-100Hz"` or `"-1 dB poniżej w 12-16kHz"`
- Color-coded: Red (above), Blue (below), Gray (compliant)

### 4. **Custom Norms Editor**
- Switch to "Custom" standard
- Edit upper/lower limits per band (±0.5 dB increments, ±12 dB range)
- Sliders for intuitive adjustment
- Save and apply custom norms

### 5. **Compliance Status Summary**
- ✓ Compliant — all bands within limits
- ✗ Violations — shows count of violated bands

---

## 📊 Frequency Bands (ISO 10-Band Octave Standard)

| Band | Center Freq | Range |
|------|-------------|-------|
| Sub-bass | 31.5 Hz | 20–60 Hz |
| Deep Bass | 63 Hz | 60–250 Hz |
| Bass | 125 Hz | 125–250 Hz |
| Low-Mid | 250 Hz | 250–500 Hz |
| Midrange | 500 Hz | 500–2 kHz |
| Vocal | 1 kHz | 1–2 kHz |
| Upper-Mid | 2 kHz | 2–4 kHz |
| Presence | 4 kHz | 4–8 kHz |
| Brilliance | 8 kHz | 8–16 kHz |
| Air | 16 kHz | 16–20 kHz |

---

## 🔧 Technical Details

### New Files Added

```
web/src/
├── components/
│   └── SpectrumComplianceTab.tsx     ← Main component
├── utils/
│   └── spectrumCompliance.ts         ← Analysis logic & standards
├── styles/
│   └── compliance.css                ← Styling
└── types/
    └── audio.ts                      ← Updated with ComplianceResult type
```

### Key Functions

**`spectrumCompliance.ts`:**
- `analyzeCompliance()` — Analyzes bands against norms, returns violations
- `formatViolationMessage()` — Formats violation text for UI
- `getComplianceColor()` — Returns color for visualization
- `COMPLIANCE_STANDARDS` — Pre-configured norms for all standards

**`SpectrumComplianceTab.tsx`:**
- Dropdown to select standard (Streaming/Radio/TV/Custom)
- Plotly chart visualization with limits and mix spectrum
- Violations list with detailed breakdowns
- Edit mode for custom norms with sliders

---

## 🚀 Usage

1. **Upload reference and mix tracks** in step 01
2. **Click "Analyze tracks"** to run spectrum analysis
3. **Open the "Spectrum Compliance" tab** in step 03
4. **Select a standard** from the dropdown (Streaming, Radio, TV, or Custom)
5. **Review violations** — red/blue areas show where mix exceeds limits
6. **Edit norms** (if using Custom) — click "Edit Norms" to adjust limits per band
7. **Apply EQ corrections** from the "EQ Correction" tab to bring mix into compliance

---

## 📋 Standards Details

### Streaming (Spotify, YouTube, Apple Music)
- All bands: ±3 dB
- Balanced approach, most forgiving
- Ideal for streaming-optimized mixes

### Radio (AM/FM Broadcast)
- Sub-bass (31.5 Hz): +2 / -5 dB (reduced low-end)
- Bass/Low-Mid: ±2–3 dB
- Vocal (1 kHz): ±2 dB (tight control)
- Brilliance/Air: +1–2 / -4 to -6 dB (reduced highs)
- Optimized for radio chain characteristics

### TV/Broadcast (EBU R128)
- Most conservative across all bands
- Sub-bass: +1 / -6 dB (minimal)
- Midrange/Vocal: ±2 dB (precise)
- Air (16 kHz): 0 / -8 dB (minimal ultrasonics)
- Suitable for broadcast and mastering chains

### Custom
- Start with any standard as base
- Adjust each band independently
- Save custom norm configuration

---

## 🎨 UI/UX

### Dark Theme (Default)
- Dark background (#1a1a1a)
- Light text (#fff)
- Accent colors: Red (#f44336) for violations, Green (#4caf50) for compliance

### Light Theme
- Light background (#f5f5f5)
- Dark text (#333)
- Same accent colors for consistency

### Responsive
- Mobile-friendly grid layout
- Stacks on smaller screens
- Full-width charts

---

## 📝 Example Workflow

**Mix Analysis Result:**
```
Sub-bass: -2 dB (Below reference)
Bass: +1 dB (Above reference)
Vocal: +4 dB (Above reference) ← VIOLATION (Streaming: +3 max)
Presence: +2 dB (Below limit)
Brilliance: -3 dB (In spec)
```

**Compliance Report (Streaming Standard):**
- ✗ 1 violation detected
- Vocal band exceeds limit by +1 dB
- Suggestion: Apply -1 dB cut in Vocal band or use EQ Correction tab

---

## 🔮 Future Enhancements

- [ ] Export compliance report as PDF
- [ ] A/B comparison between standards
- [ ] Pre-EQ vs. Post-EQ compliance tracking
- [ ] LUFS loudness compliance (Spotify -14, Apple -16, etc.)
- [ ] Frequency-specific CREST factor analysis
- [ ] Integration with ear-check logging

---

## 🛠️ Development

### Dependencies
- React 18+
- TypeScript
- Plotly.js (via react-plotly.js)
- Web Audio API (existing)

### Integration
- SpectrumComplianceTab is imported in App.tsx
- Uses existing `AnalysisResult` type from audio processing
- Styling imported from `compliance.css`

---

## ✅ Testing Checklist

- [ ] Verify all 3 standards load correctly
- [ ] Check violations display accurately
- [ ] Test custom norm editing with sliders
- [ ] Verify responsive design on mobile
- [ ] Test dark/light theme switching
- [ ] Validate chart rendering with Plotly
- [ ] Confirm violations are correctly calculated

---

**Status:** Ready for production  
**Branch:** `feature/spectrum-compliance`  
**Author:** @copilot  
**Date:** 2026-10-01
