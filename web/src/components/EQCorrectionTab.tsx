import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Plot from "./Plot";
import type { AnalysisResult } from "../types/audio";
import {
  EQ_31_BAND_Q,
  EQ_31_CENTER_FREQUENCIES,
  EQ_31_MAX_GAIN_DB,
  applyEq31Correction,
  calculateIdealEq31Gains,
  clampEq31Gain,
  createDefaultEq31Gains,
  formatEq31Label,
} from "../utils/eq31Bands";

type AbMode = "before" | "after";

export default function EQCorrectionTab({
  analysis,
  mixFile,
}: {
  analysis: AnalysisResult;
  mixFile: File | null;
}) {
  const [gains, setGains] = useState<number[]>(createDefaultEq31Gains);
  const [abMode, setAbMode] = useState<AbMode>("after");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [previewError, setPreviewError] = useState("");
  // 0-100%: how far the 31 sliders are pulled toward the ideal correction
  // (see `idealGains` below). "Locked" means every slider still matches what
  // the Master Slider would set at its current percentage; manually moving
  // any single slider unlocks it (the percentage stays put, but future
  // Master Slider moves overwrite that manual tweak again).
  const [masterPercent, setMasterPercent] = useState(0);
  const [isMasterLocked, setIsMasterLocked] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[] | null>(null);

  const previewSupported = typeof AudioContext !== "undefined";

  // Firefox only renders a native vertical slider track when the
  // non-standard `orient="vertical"` attribute is set (unlike
  // Chrome/Safari, which use `-webkit-appearance: slider-vertical` in CSS);
  // React doesn't type this attribute, so it's applied imperatively here.
  const setVerticalOrient = useCallback((element: HTMLInputElement | null) => {
    element?.setAttribute("orient", "vertical");
  }, []);

  function ensureContext(): AudioContext {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }

  function ensureFilters(context: AudioContext): BiquadFilterNode[] {
    if (!filtersRef.current) {
      const filters = EQ_31_CENTER_FREQUENCIES.map((frequency) => {
        const filter = context.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = frequency;
        filter.Q.value = EQ_31_BAND_Q;
        filter.gain.value = 0;
        return filter;
      });
      for (let index = 0; index < filters.length - 1; index += 1) {
        filters[index].connect(filters[index + 1]);
      }
      filters[filters.length - 1].connect(context.destination);
      filtersRef.current = filters;
    }
    return filtersRef.current;
  }

  function stopPlayback() {
    const source = sourceRef.current;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }

  // Decode the mix file once (per file) so live preview can start instantly.
  useEffect(() => {
    let cancelled = false;
    stopPlayback();
    bufferRef.current = null;
    setPreviewError("");
    if (!mixFile || !previewSupported) return;
    setIsDecoding(true);
    (async () => {
      try {
        const context = ensureContext();
        const arrayBuffer = await mixFile.arrayBuffer();
        const decoded = await context.decodeAudioData(arrayBuffer);
        if (!cancelled) bufferRef.current = decoded;
      } catch {
        if (!cancelled) {
          setPreviewError("Could not decode this mix file for live preview.");
        }
      } finally {
        if (!cancelled) setIsDecoding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixFile]);

  // Stop playback and close the audio graph when leaving the tab/unmounting.
  useEffect(() => {
    return () => {
      stopPlayback();
      filtersRef.current?.forEach((filter) => filter.disconnect());
      filtersRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the live filter chain in sync with the sliders and A/B switch so
  // changes are heard immediately, even while audio is already playing. The
  // filter chain is only created lazily on first play (see `togglePlayback`),
  // so before that this is a no-op; `togglePlayback` applies the current
  // gains/A-B mode itself when it creates the chain, so nothing is missed.
  useEffect(() => {
    const filters = filtersRef.current;
    if (!filters) return;
    filters.forEach((filter, index) => {
      filter.gain.value = abMode === "after" ? clampEq31Gain(gains[index] ?? 0) : 0;
    });
  }, [gains, abMode]);

  async function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (!bufferRef.current) return;
    try {
      const context = ensureContext();
      if (context.state === "suspended") await context.resume();
      const filters = ensureFilters(context);
      filters.forEach((filter, index) => {
        filter.gain.value = abMode === "after" ? clampEq31Gain(gains[index] ?? 0) : 0;
      });
      const source = context.createBufferSource();
      source.buffer = bufferRef.current;
      source.connect(filters[0]);
      source.onended = () => {
        source.disconnect();
        if (sourceRef.current === source) sourceRef.current = null;
        setIsPlaying(false);
      };
      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
    } catch {
      setPreviewError("Playback could not start in this browser.");
    }
  }

  function updateGain(index: number, value: number) {
    setGains((previous) => {
      const next = previous.slice();
      next[index] = clampEq31Gain(value);
      return next;
    });
    // A manual tweak to a single band means the rack no longer exactly
    // reflects the Master Slider's percentage.
    setIsMasterLocked(false);
  }

  function resetGains() {
    setGains(createDefaultEq31Gains());
    setMasterPercent(0);
    setIsMasterLocked(true);
  }

  // Ideal correction for each band (reference − mix), i.e. what the Master
  // Slider dials in at 100%.
  const idealGains = useMemo(
    () => calculateIdealEq31Gains(analysis.frequencies, analysis.mixSpectrum, analysis.referenceSpectrum),
    [analysis.frequencies, analysis.mixSpectrum, analysis.referenceSpectrum],
  );

  function applyMasterPercent(percent: number) {
    const clampedPercent = Math.min(100, Math.max(0, percent));
    setMasterPercent(clampedPercent);
    setGains(idealGains.map((gain) => clampEq31Gain((gain * clampedPercent) / 100)));
    setIsMasterLocked(true);
  }

  // Keep the rack in sync with the Master Slider when the ideal correction
  // itself changes (e.g. a new mix/reference analysis), as long as no band
  // has been manually unlocked in the meantime.
  useEffect(() => {
    if (!isMasterLocked) return;
    setGains(idealGains.map((gain) => clampEq31Gain((gain * masterPercent) / 100)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idealGains]);

  const correctedSpectrum = useMemo(
    () => applyEq31Correction(analysis.frequencies, analysis.mixSpectrum, gains, analysis.sampleRate),
    [analysis.frequencies, analysis.mixSpectrum, analysis.sampleRate, gains],
  );
  const hasCorrections = gains.some((value) => value !== 0);

  return (
    <div className="eq-correction">
      <div className="chart-frame" id="eq-correction-chart">
        {/* Line colors mirror the legend classes in styles.css
            (.legend-line.blue/.gray/.green) — keep both in sync if changed. */}
        <Plot
          data={[
            {
              type: "scatter",
              mode: "lines",
              name: "Reference",
              x: analysis.frequencies,
              y: analysis.referenceSpectrum,
              line: { color: "#5a9cf5", width: 2 },
              hovertemplate: "Reference<br>%{x:.1f} Hz<br>%{y:.2f} dBFS<extra></extra>",
            },
            {
              type: "scatter",
              mode: "lines",
              name: "Original mix",
              x: analysis.frequencies,
              y: analysis.mixSpectrum,
              line: { color: "#c3ad5e", width: 2, dash: "dot" },
              hovertemplate: "Original mix<br>%{x:.1f} Hz<br>%{y:.2f} dBFS<extra></extra>",
            },
            {
              type: "scatter",
              mode: "lines",
              name: "Corrected mix",
              x: analysis.frequencies,
              y: correctedSpectrum,
              line: { color: "#4caf6a", width: 2 },
              hovertemplate: "Corrected mix<br>%{x:.1f} Hz<br>%{y:.2f} dBFS<extra></extra>",
            },
          ]}
          layout={{
            autosize: true,
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#a8b4c3", family: "Inter, sans-serif" },
            margin: { l: 68, r: 22, t: 16, b: 56 },
            xaxis: {
              title: { text: "Frequency (Hz)" },
              type: "log",
              range: [Math.log10(20), Math.log10(20000)],
              gridcolor: "#283342",
              zeroline: false,
            },
            yaxis: { title: { text: "Level (dBFS)" }, gridcolor: "#283342", zeroline: false },
            legend: { orientation: "h", y: 1.12, x: 0 },
            uirevision: "eq-correction-live",
          }}
          config={{ responsive: true, displaylogo: false, scrollZoom: true }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="eq-correction-toolbar">
        <div className="ab-switch" role="group" aria-label="Compare before and after the correction">
          <button
            type="button"
            className={`ab-switch-option ${abMode === "before" ? "active" : ""}`}
            onClick={() => setAbMode("before")}
            aria-pressed={abMode === "before"}
          >
            A · Original
          </button>
          <button
            type="button"
            className={`ab-switch-option ${abMode === "after" ? "active" : ""}`}
            onClick={() => setAbMode("after")}
            aria-pressed={abMode === "after"}
          >
            B · Corrected
          </button>
        </div>

        <div className="eq-preview-controls">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void togglePlayback()}
            disabled={!previewSupported || !mixFile || isDecoding || !bufferRef.current}
          >
            {isPlaying ? "■ Stop" : "▶ Play preview"}
          </button>
          <span className="eq-preview-status">
            {!previewSupported
              ? "Live preview isn't supported in this browser."
              : isDecoding
                ? "Preparing audio…"
                : `Previewing: ${abMode === "after" ? "corrected mix" : "original mix"}`}
          </span>
        </div>

        <button type="button" className="button button-secondary" onClick={resetGains} disabled={!hasCorrections}>
          Reset all bands
        </button>
      </div>
      {previewError && <p className="error-message" role="alert">{previewError}</p>}

      <div className="eq-master-slider" role="group" aria-label="Master Auto-EQ correction">
        <div className="eq-master-header">
          <span className="eq-master-title">Master Slider · Auto-EQ</span>
          <span
            className={`eq-master-lock ${isMasterLocked ? "locked" : "unlocked"}`}
            title={
              isMasterLocked
                ? "All 31 bands match the Master Slider"
                : "A band was adjusted manually — Master Slider is unlocked"
            }
          >
            {isMasterLocked ? "🔒 Locked" : "🔓 Unlocked"}
          </span>
        </div>
        <div className="eq-master-controls">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={masterPercent}
            onChange={(event) => applyMasterPercent(Number(event.target.value))}
            className="eq-master-range"
            aria-label="Master Auto-EQ correction percentage"
          />
          <span className="eq-master-value">{Math.round(masterPercent)}%</span>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => applyMasterPercent(0)}
            disabled={masterPercent === 0 && isMasterLocked}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="eq-slider-rack" role="group" aria-label="31-band EQ correction">
        {EQ_31_CENTER_FREQUENCIES.map((frequency, index) => {
          const gain = gains[index] ?? 0;
          return (
            <div className="eq-slider-band" key={frequency}>
              <span className={`eq-slider-value ${gain > 0 ? "value-boost" : gain < 0 ? "value-cut" : ""}`}>
                {gain > 0 ? "+" : ""}
                {gain.toFixed(1)}
              </span>
              <div className="eq-slider-track">
                <input
                  type="range"
                  ref={setVerticalOrient}
                  min={-EQ_31_MAX_GAIN_DB}
                  max={EQ_31_MAX_GAIN_DB}
                  step={0.1}
                  value={gain}
                  onChange={(event) => updateGain(index, Number(event.target.value))}
                  aria-label={`${formatEq31Label(frequency)} Hz correction`}
                  className="eq-vertical-slider"
                />
              </div>
              <input
                type="number"
                className="eq-slider-input"
                min={-EQ_31_MAX_GAIN_DB}
                max={EQ_31_MAX_GAIN_DB}
                step={0.1}
                value={gain}
                onChange={(event) => updateGain(index, Number(event.target.value))}
                aria-label={`${formatEq31Label(frequency)} Hz correction in dB`}
              />
              <span className="eq-slider-label">{formatEq31Label(frequency)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
