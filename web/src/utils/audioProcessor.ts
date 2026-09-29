import type { AnalysisResult } from "../types/audio";
import { calculateBandDifferences } from "./frequencyBands";

const FFT_SIZE = 8192;
const HOP_SIZE = 256;
// Width (in bins) of the moving-average window applied to smooth spectra and
// per-band differences, reducing spiky anomalies from transients/noise while
// preserving the overall spectral shape.
const SMOOTHING_WINDOW = 5;
const HEATMAP_BANDS = 160;
const MAX_TIME_COLUMNS = 360;
const MIN_FREQUENCY = 20;
const MAX_FREQUENCY = 20000;
const EPSILON = 1e-12;

type ProgressCallback = (progress: number) => void;

async function decodeFile(file: File): Promise<AudioBuffer> {
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(await file.arrayBuffer());
  } finally {
    await context.close();
  }
}

function toMono(buffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index += 1) {
      mono[index] += samples[index] / buffer.numberOfChannels;
    }
  }

  let first = 0;
  let last = mono.length - 1;
  while (first < mono.length && Math.abs(mono[first]) < 1e-5) first += 1;
  while (last > first && Math.abs(mono[last]) < 1e-5) last -= 1;
  return first < mono.length ? mono.slice(first, last + 1) : mono;
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

function fft(real: Float64Array, imag: Float64Array): void {
  const size = real.length;
  for (let i = 1, j = 0; i < size; i += 1) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let twiddleReal = 1;
      let twiddleImag = 0;
      const half = length >> 1;
      for (let offset = 0; offset < half; offset += 1) {
        const even = start + offset;
        const odd = even + half;
        const productReal =
          real[odd] * twiddleReal - imag[odd] * twiddleImag;
        const productImag =
          real[odd] * twiddleImag + imag[odd] * twiddleReal;
        real[odd] = real[even] - productReal;
        imag[odd] = imag[even] - productImag;
        real[even] += productReal;
        imag[even] += productImag;
        const nextReal = twiddleReal * stepReal - twiddleImag * stepImag;
        twiddleImag = twiddleReal * stepImag + twiddleImag * stepReal;
        twiddleReal = nextReal;
      }
    }
  }
}

function magnitudeDb(magnitude: number): number {
  return 20 * Math.log10(Math.max(EPSILON, magnitude));
}

// Applies a centered moving-average filter over dB values to smooth out
// spiky anomalies (transients, noise) while keeping the underlying
// frequencies array unchanged (no resampling). Edges use a shrinking window
// so the array length is preserved.
function smoothDbValues(values: number[], windowSize: number): number[] {
  if (windowSize <= 1 || values.length <= 1) return values.slice();
  const half = Math.floor(windowSize / 2);
  return values.map((_, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(values.length - 1, index + half);
    let sum = 0;
    for (let i = start; i <= end; i += 1) sum += values[i];
    return sum / (end - start + 1);
  });
}

export async function analyzeAudio(
  referenceFile: File,
  mixFile: File,
  normalizeLoudness: boolean,
  onProgress: ProgressCallback,
): Promise<AnalysisResult> {
  const [referenceBuffer, mixBuffer] = await Promise.all([
    decodeFile(referenceFile),
    decodeFile(mixFile),
  ]);
  const sampleRate = referenceBuffer.sampleRate;
  if (mixBuffer.sampleRate !== sampleRate) {
    throw new Error("The browser decoded the files at different sample rates.");
  }

  const reference = toMono(referenceBuffer);
  const mix = toMono(mixBuffer);
  if (!reference.length || !mix.length) {
    throw new Error("One of the audio files does not contain usable audio.");
  }

  const referenceRms = rms(reference);
  const mixRms = rms(mix);
  if (referenceRms < EPSILON || mixRms < EPSILON) {
    throw new Error("Both files need to contain audible audio.");
  }
  const gain = normalizeLoudness ? referenceRms / mixRms : 1;
  const normalizationGainDb = 20 * Math.log10(gain);

  const maxBin = Math.min(
    Math.floor(MAX_FREQUENCY / (sampleRate / FFT_SIZE)),
    FFT_SIZE / 2,
  );
  const minBin = Math.max(
    1,
    Math.ceil(MIN_FREQUENCY / (sampleRate / FFT_SIZE)),
  );
  const frequencies = Array.from(
    { length: maxBin - minBin + 1 },
    (_, index) => ((index + minBin) * sampleRate) / FFT_SIZE,
  );
  const bucketForBin = new Int16Array(maxBin + 1);
  const bucketCounts = new Uint32Array(HEATMAP_BANDS);
  const logRange = Math.log(MAX_FREQUENCY / MIN_FREQUENCY);
  frequencies.forEach((frequency, index) => {
    const bucket = Math.min(
      HEATMAP_BANDS - 1,
      Math.max(
        0,
        Math.floor((Math.log(frequency / MIN_FREQUENCY) / logRange) * HEATMAP_BANDS),
      ),
    );
    bucketForBin[index + minBin] = bucket;
    bucketCounts[bucket] += 1;
  });

  const alignedLength = Math.min(reference.length, mix.length);
  const frameCount = Math.max(
    1,
    Math.ceil(Math.max(0, alignedLength - FFT_SIZE) / HOP_SIZE) + 1,
  );
  const timeColumnCount = Math.min(MAX_TIME_COLUMNS, frameCount);
  const referenceTotals = new Float64Array(frequencies.length);
  const mixTotals = new Float64Array(frequencies.length);
  const referenceHeat = new Float64Array(timeColumnCount * HEATMAP_BANDS);
  const mixHeat = new Float64Array(timeColumnCount * HEATMAP_BANDS);
  const heatFrameCounts = new Uint32Array(timeColumnCount);
  const window = Float64Array.from(
    { length: FFT_SIZE },
    (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (FFT_SIZE - 1)),
  );
  const refReal = new Float64Array(FFT_SIZE);
  const refImag = new Float64Array(FFT_SIZE);
  const mixReal = new Float64Array(FFT_SIZE);
  const mixImag = new Float64Array(FFT_SIZE);
  const refBuckets = new Float64Array(HEATMAP_BANDS);
  const mixBuckets = new Float64Array(HEATMAP_BANDS);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const offset = frame * HOP_SIZE;
    refReal.fill(0);
    refImag.fill(0);
    mixReal.fill(0);
    mixImag.fill(0);
    for (let index = 0; index < FFT_SIZE; index += 1) {
      const sampleIndex = offset + index;
      refReal[index] =
        (reference[sampleIndex] ?? 0) * window[index];
      mixReal[index] = (mix[sampleIndex] ?? 0) * gain * window[index];
    }
    fft(refReal, refImag);
    fft(mixReal, mixImag);
    refBuckets.fill(0);
    mixBuckets.fill(0);

    for (let index = 0; index < frequencies.length; index += 1) {
      const bin = index + minBin;
      const refMagnitude = Math.hypot(refReal[bin], refImag[bin]);
      const mixMagnitude = Math.hypot(mixReal[bin], mixImag[bin]);
      referenceTotals[index] += refMagnitude;
      mixTotals[index] += mixMagnitude;
      const bucket = bucketForBin[bin];
      refBuckets[bucket] += refMagnitude;
      mixBuckets[bucket] += mixMagnitude;
    }

    const column = Math.min(
      timeColumnCount - 1,
      Math.floor((frame * timeColumnCount) / frameCount),
    );
    const heatOffset = column * HEATMAP_BANDS;
    for (let bucket = 0; bucket < HEATMAP_BANDS; bucket += 1) {
      referenceHeat[heatOffset + bucket] += refBuckets[bucket];
      mixHeat[heatOffset + bucket] += mixBuckets[bucket];
    }
    heatFrameCounts[column] += 1;

    if (frame % 96 === 95 || frame === frameCount - 1) {
      onProgress(5 + Math.round(((frame + 1) / frameCount) * 90));
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
    }
  }

  const rawReferenceSpectrum = Array.from(referenceTotals, (value) =>
    magnitudeDb((value / frameCount) * (2 / FFT_SIZE)),
  );
  const rawMixSpectrum = Array.from(mixTotals, (value) =>
    magnitudeDb((value / frameCount) * (2 / FFT_SIZE)),
  );
  const referenceSpectrum = smoothDbValues(rawReferenceSpectrum, SMOOTHING_WINDOW);
  const mixSpectrum = smoothDbValues(rawMixSpectrum, SMOOTHING_WINDOW);
  const differenceDb = smoothDbValues(
    mixSpectrum.map((value, index) => value - referenceSpectrum[index]),
    SMOOTHING_WINDOW,
  );
  const heatmapValues = Array.from({ length: HEATMAP_BANDS }, (_, bucket) =>
    Array.from({ length: timeColumnCount }, (_, column) => {
      const index = column * HEATMAP_BANDS + bucket;
      const frames = Math.max(1, heatFrameCounts[column]);
      const count = Math.max(1, bucketCounts[bucket]);
      const refMean = referenceHeat[index] / (frames * count);
      const mixMean = mixHeat[index] / (frames * count);
      return magnitudeDb(mixMean) - magnitudeDb(refMean);
    }),
  );
  const heatmapFrequencies = Array.from({ length: HEATMAP_BANDS }, (_, bucket) =>
    MIN_FREQUENCY * Math.exp(((bucket + 0.5) / HEATMAP_BANDS) * logRange),
  );
  const times = Array.from(
    { length: timeColumnCount },
    (_, column) =>
      ((column + 0.5) / timeColumnCount) *
      (Math.min(reference.length, mix.length) / sampleRate),
  );

  onProgress(100);
  return {
    frequencies,
    referenceSpectrum,
    mixSpectrum,
    differenceDb,
    times,
    heatmapFrequencies,
    heatmapValues,
    bands: calculateBandDifferences(frequencies, differenceDb),
    sampleRate,
    duration: Math.min(reference.length, mix.length) / sampleRate,
    normalizationGainDb,
  };
}
