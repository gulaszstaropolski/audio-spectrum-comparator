import { useEffect, useMemo, useRef, useState } from "react";
import AudioUpload from "./components/AudioUpload";
import BandAnalysisChart from "./components/BandAnalysisChart";
import CorrectionChart from "./components/CorrectionChart";
import DataTable from "./components/DataTable";
import ExportOptions from "./components/ExportOptions";
import HeatmapChart from "./components/HeatmapChart";
import SpectrumChart from "./components/SpectrumChart";
import type { AnalysisResult, SavedSession } from "./types/audio";
import { analyzeAudio } from "./utils/audioProcessor";
import { EXTREME_CORRECTION_DB, calculateEqCorrections } from "./utils/frequencyBands";

const STORAGE_KEY = "audio-spectrum-comparator.sessions";
const TABS = [
  { id: "heatmap", label: "Difference heatmap" },
  { id: "spectrum", label: "Spectrum overlay" },
  { id: "bands", label: "Frequency bands" },
  { id: "correction", label: "EQ Correction" },
  { id: "data", label: "Data table" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function readSessions(): SavedSession[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedSession[];
  } catch {
    return [];
  }
}

function formatDuration(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  return `${minutes}:${String(roundedSeconds % 60).padStart(2, "0")}`;
}

export default function App() {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [mixFile, setMixFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sessions, setSessions] = useState<SavedSession[]>(readSessions);
  const [sessionId, setSessionId] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("heatmap");
  const [normalization, setNormalization] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [previewChoice, setPreviewChoice] = useState<"reference" | "mix">("reference");
  const [previewUrl, setPreviewUrl] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewFile = previewChoice === "reference" ? referenceFile : mixFile;
  const eqCorrections = useMemo(
    () => (analysis ? calculateEqCorrections(analysis.bands) : []),
    [analysis],
  );
  const hasExtremeCorrection = eqCorrections.some(
    (band) => Math.abs(band.correctionDb) > EXTREME_CORRECTION_DB,
  );

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(previewFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function runAnalysis() {
    if (!referenceFile || !mixFile) return;
    setError("");
    setAnalyzing(true);
    setProgress(0);
    try {
      const result = await analyzeAudio(
        referenceFile,
        mixFile,
        normalization,
        setProgress,
      );
      setAnalysis(result);
      setSessionId("");
      setActiveTab("heatmap");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The audio files could not be analyzed. Try WAV, MP3, or FLAC.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function saveSession() {
    if (!analysis) return;
    const session: SavedSession = {
      id: crypto.randomUUID(),
      name: `${referenceFile?.name ?? "Reference"} vs ${mixFile?.name ?? "Mix"}`,
      savedAt: new Date().toISOString(),
      analysis,
    };
    const updated = [session, ...sessions].slice(0, 6);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSessions(updated);
      setSessionId(session.id);
      setAnalysis(session.analysis);
      setError("");
    } catch {
      setError("Could not save this session. Your browser storage may be full.");
    }
  }

  function loadSession(id: string) {
    setSessionId(id);
    const session = sessions.find((saved) => saved.id === id);
    if (session) setAnalysis(session.analysis);
  }

  function controlPreview(action: "play" | "rewind" | "back" | "forward") {
    const player = audioRef.current;
    if (!player) return;
    if (action === "play") {
      if (player.paused) void player.play();
      else player.pause();
    } else if (action === "rewind") {
      player.currentTime = 0;
    } else if (action === "back") {
      player.currentTime = Math.max(0, player.currentTime - 10);
    } else {
      player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Audio Spectrum Comparator home">
          <span className="brand-mark" aria-hidden="true">∿</span>
          <span>SONIC<span className="brand-light">MATCH</span></span>
        </a>
        <div className="topbar-right">
          <span className="privacy-indicator"><i /> Private · processed in your browser</span>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>
        </div>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">MIX REFERENCE ANALYSIS</p>
        <h1>Hear the difference.<br /><span>See where it lives.</span></h1>
        <p className="intro-copy">
          Compare your mix against a reference across the full frequency spectrum.
          Your audio never leaves this device.
        </p>
      </section>

      <section className="panel upload-panel">
        <div className="section-heading">
          <div><span className="step-number">01</span><h2>Choose your audio</h2></div>
          <span className="supported-formats">WAV · MP3 · FLAC · OGG · M4A</span>
        </div>
        <AudioUpload
          referenceFile={referenceFile}
          mixFile={mixFile}
          onReferenceChange={setReferenceFile}
          onMixChange={setMixFile}
        />
        <div className="analyze-row">
          <label className="check-control">
            <input
              type="checkbox"
              checked={normalization}
              onChange={(event) => setNormalization(event.target.checked)}
            />
            <span>Match loudness before comparison</span>
            <span className="help-tip" title="Scale the mix to the reference RMS level so differences in overall volume don't dominate the comparison.">?</span>
          </label>
          <button
            className="button button-primary"
            onClick={() => void runAnalysis()}
            disabled={!referenceFile || !mixFile || analyzing}
          >
            {analyzing ? "Analyzing…" : "Analyze tracks"} <span aria-hidden="true">→</span>
          </button>
        </div>
        {analyzing && (
          <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
            <small>{progress < 5 ? "Decoding audio…" : `Analyzing frequency frames… ${progress}%`}</small>
          </div>
        )}
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>

      {analysis && (
        <>
          <section className="results-section">
            <div className="section-heading results-heading">
              <div><span className="step-number">02</span><h2>Analysis</h2></div>
              <div className="session-actions">
                {sessions.length > 0 && (
                  <select
                    className="session-select"
                    aria-label="Load saved session"
                    value={sessionId}
                    onChange={(event) => loadSession(event.target.value)}
                  >
                    <option value="">Saved sessions</option>
                    {sessions.map((session) => (
                      <option value={session.id} key={session.id}>
                        {session.name} · {new Date(session.savedAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                )}
                <button className="button button-secondary" onClick={saveSession}>Save session</button>
              </div>
            </div>

            <div className="metric-grid">
              <article className="metric-card">
                <span>Compared duration</span><strong>{formatDuration(analysis.duration)}</strong>
              </article>
              <article className="metric-card">
                <span>Analysis resolution</span><strong>{analysis.frequencies.length.toLocaleString()} bins</strong>
              </article>
              <article className="metric-card">
                <span>Sample rate</span><strong>{(analysis.sampleRate / 1000).toFixed(1)} kHz</strong>
              </article>
              <article className="metric-card">
                <span>Mix gain applied</span>
                <strong>{analysis.normalizationGainDb >= 0 ? "+" : ""}{analysis.normalizationGainDb.toFixed(1)} dB</strong>
              </article>
            </div>

            <div className="panel chart-panel">
              <div className="section-heading chart-heading">
                <div><span className="step-number">03</span><h2>Explore the difference</h2></div>
                <span className="chart-hint">Hover for values · scroll to zoom · drag to pan</span>
              </div>
              <div className="tab-list" role="tablist" aria-label="Analysis charts">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="chart-legend">
                {activeTab === "heatmap" && (
                  <>
                    <span><i className="legend-dot blue" /> Mix quieter than reference</span>
                    <span><i className="legend-dot red" /> Mix louder than reference</span>
                  </>
                )}
                {activeTab === "spectrum" && (
                  <>
                    <span><i className="legend-line blue" /> Reference</span>
                    <span><i className="legend-line red" /> Mix</span>
                  </>
                )}
                {activeTab === "bands" && (
                  <span>Positive = mix louder · Negative = mix quieter</span>
                )}
                {activeTab === "correction" && (
                  <>
                    <span><i className="legend-dot boost" /> Boost (lift)</span>
                    <span><i className="legend-dot cut" /> Cut</span>
                  </>
                )}
                {activeTab === "data" && (
                  <span>Showing all {analysis.frequencies.length.toLocaleString()} frequency bins</span>
                )}
              </div>
              <div className="chart-content" role="tabpanel">
                {activeTab === "heatmap" && <HeatmapChart analysis={analysis} />}
                {activeTab === "spectrum" && <SpectrumChart analysis={analysis} />}
                {activeTab === "bands" && <BandAnalysisChart analysis={analysis} />}
                {activeTab === "correction" && (
                  <CorrectionChart corrections={eqCorrections} />
                )}
                {activeTab === "data" && <DataTable analysis={analysis} />}
              </div>
              {activeTab === "heatmap" && (
                <p className="chart-note">Red areas indicate frequencies where the mix is louder; blue areas are quieter. Use the time axis to locate when the difference occurs.</p>
              )}
              {activeTab === "spectrum" && (
                <p className="chart-note">The curves show average level by frequency. A higher mix curve means that frequency range is more prominent in your mix.</p>
              )}
              {activeTab === "bands" && (
                <div className="band-guidance">
                  {analysis.bands.map((band) => (
                    <p key={band.name}>
                      <strong>{band.name}</strong>
                      <span className={band.differenceDb >= 0 ? "value-positive" : "value-negative"}>
                        {band.differenceDb >= 0 ? "Above" : "Below"} reference by {Math.abs(band.differenceDb).toFixed(1)} dB
                      </span>
                    </p>
                  ))}
                </div>
              )}
              {activeTab === "correction" && (
                <>
                  <p className="chart-note">
                    Suggested parametric EQ correction to bring your mix closer to the reference.
                    Positive dB values boost a band, negative values cut it. Export a preset below
                    and load it into your VST EQ (ReaEQ, FabFilter Pro-Q, or similar).
                  </p>
                  {hasExtremeCorrection && (
                    <p className="warning-message" role="alert">
                      ⚠ One or more bands need a correction greater than {EXTREME_CORRECTION_DB} dB.
                      Such large moves are rarely musical — consider applying them gradually or in multiple passes.
                    </p>
                  )}
                  <div className="band-guidance">
                    {eqCorrections.map((band) => (
                      <p key={band.name}>
                        <strong>{band.name}</strong>
                        <span className={band.correctionDb >= 0 ? "value-boost" : "value-cut"}>
                          {band.correctionDb >= 0 ? "Boost" : "Cut"} {Math.abs(band.correctionDb).toFixed(1)} dB @ {band.center} Hz (Q {band.q})
                        </span>
                      </p>
                    ))}
                  </div>
                </>
              )}
              <ExportOptions analysis={analysis} activeTab={activeTab} />
            </div>
          </section>

          <section className="panel preview-panel">
            <div className="section-heading">
              <div><span className="step-number">04</span><h2>Listen and compare</h2></div>
              <span className="chart-hint">Preview is for reference only; analysis uses the full track.</span>
            </div>
            <div className="preview-controls">
              <select
                className="session-select"
                value={previewChoice}
                onChange={(event) => setPreviewChoice(event.target.value as "reference" | "mix")}
                aria-label="Choose track to preview"
              >
                <option value="reference">Reference track</option>
                <option value="mix">Your mix</option>
              </select>
              <button className="button button-secondary" onClick={() => controlPreview("rewind")}>↶ Start</button>
              <button className="button button-secondary" onClick={() => controlPreview("back")}>−10 sec</button>
              <button className="button button-secondary" onClick={() => controlPreview("play")}>Play / pause</button>
              <button className="button button-secondary" onClick={() => controlPreview("forward")}>+10 sec</button>
              <audio ref={audioRef} src={previewUrl || undefined} controls preload="metadata" />
            </div>
          </section>
        </>
      )}

      <footer>
        <span>SONICMATCH · Browser-based audio analysis</span>
        <span>Files stay on your device. No upload, no account, no server.</span>
      </footer>
    </main>
  );
}
