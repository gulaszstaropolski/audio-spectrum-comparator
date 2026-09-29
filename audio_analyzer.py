import librosa
import numpy as np
from scipy import signal
from PyQt5.QtCore import QObject, pyqtSignal

class AudioAnalyzer:
    def __init__(self):
        self.sr = 44100  # Sample rate
        self.n_fft = 4096  # FFT size for high resolution
        self.hop_length = 512

    def load_audio(self, file_path):
        """Load audio file and remove silence at beginning and end"""
        y, sr = librosa.load(file_path, sr=self.sr, mono=True)
        
        # Remove silence
        y_trimmed, _ = librosa.effects.trim(y, top_db=40)
        return y_trimmed, sr

    def compute_spectrum(self, y, sr):
        """Compute FFT spectrum with proper windowing"""
        # Apply Hann window
        window = signal.windows.hann(len(y))
        y_windowed = y * window
        
        # Compute FFT
        fft = np.fft.rfft(y_windowed, n=self.n_fft)
        magnitude = np.abs(fft)
        
        # Convert to dB
        epsilon = 1e-10
        magnitude_db = 20 * np.log10(magnitude + epsilon)
        
        # Frequency axis
        freqs = np.fft.rfftfreq(self.n_fft, d=1/sr)
        
        return freqs, magnitude_db

    def compute_spectrogram(self, y, sr):
        """Compute spectrogram for time-frequency analysis"""
        S = librosa.stft(y, n_fft=self.n_fft, hop_length=self.hop_length)
        S_db = librosa.power_to_db(np.abs(S) ** 2, ref=np.max)
        
        time_axis = librosa.frames_to_time(np.arange(S_db.shape[1]), sr=sr, hop_length=self.hop_length)
        freqs = librosa.fft_frequencies(sr=sr, n_fft=self.n_fft)
        
        return freqs, time_axis, S_db

    def normalize_to_loudness(self, y, target_loudness=-13):
        """Normalize audio to target loudness (LUFS-like)"""
        # Simple RMS-based normalization
        current_rms = np.sqrt(np.mean(y ** 2))
        target_rms = 10 ** (target_loudness / 20)
        gain = target_rms / (current_rms + 1e-10)
        return y * gain

    def compare_spectra(self, ref_path, mix_path):
        """Compare two audio files and return analysis"""
        # Load and trim
        ref_audio, sr = self.load_audio(ref_path)
        mix_audio, _ = self.load_audio(mix_path)
        
        # Normalize mix to reference loudness
        ref_rms = np.sqrt(np.mean(ref_audio ** 2))
        mix_audio = mix_audio * (ref_rms / (np.sqrt(np.mean(mix_audio ** 2)) + 1e-10))
        
        # Compute spectra
        ref_freqs, ref_spectrum = self.compute_spectrum(ref_audio, sr)
        mix_freqs, mix_spectrum = self.compute_spectrum(mix_audio, sr)
        
        # Ensure same frequency resolution
        min_len = min(len(ref_spectrum), len(mix_spectrum))
        ref_spectrum = ref_spectrum[:min_len]
        mix_spectrum = mix_spectrum[:min_len]
        freqs = ref_freqs[:min_len]
        
        # Compute difference
        diff_db = mix_spectrum - ref_spectrum
        
        # Compute spectrograms for heatmap
        ref_freqs_sg, ref_time, ref_spectrogram = self.compute_spectrogram(ref_audio, sr)
        mix_freqs_sg, mix_time, mix_spectrogram = self.compute_spectrogram(mix_audio, sr)
        
        # Ensure same shape
        min_time_frames = min(ref_spectrogram.shape[1], mix_spectrogram.shape[1])
        ref_spectrogram = ref_spectrogram[:, :min_time_frames]
        mix_spectrogram = mix_spectrogram[:, :min_time_frames]
        time_axis = ref_time[:min_time_frames]
        
        diff_spectrogram = mix_spectrogram - ref_spectrogram
        
        # Compute band differences
        band_diffs = self.compute_band_differences(freqs, diff_db)
        
        return {
            'freqs': freqs,
            'ref_spectrum': ref_spectrum,
            'mix_spectrum': mix_spectrum,
            'diff_db': diff_db,
            'time_axis': time_axis,
            'diff_spectrogram': diff_spectrogram,
            'band_diffs': band_diffs
        }

    def compute_band_differences(self, freqs, diff_db):
        """Compute average differences in frequency bands"""
        bands = {
            'Sub-bass (20-60Hz)': (20, 60),
            'Bass (60-250Hz)': (60, 250),
            'Low-Mid (250-500Hz)': (250, 500),
            'Mid (500Hz-2kHz)': (500, 2000),
            'Upper-Mid (2k-4kHz)': (2000, 4000),
            'Presence (4k-8kHz)': (4000, 8000),
            'Brilliance (8k-16kHz)': (8000, 16000)
        }
        
        band_diffs = {}
        for band_name, (low, high) in bands.items():
            mask = (freqs >= low) & (freqs <= high)
            if np.sum(mask) > 0:
                avg_diff = np.mean(diff_db[mask])
                band_diffs[band_name] = avg_diff
        
        return band_diffs

class AnalysisWorker(QObject):
    progress = pyqtSignal(int)
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)
    
    def __init__(self, ref_path, mix_path, analyzer):
        super().__init__()
        self.ref_path = ref_path
        self.mix_path = mix_path
        self.analyzer = analyzer
    
    def run(self):
        try:
            self.progress.emit(25)
            results = self.analyzer.compare_spectra(self.ref_path, self.mix_path)
            self.progress.emit(100)
            self.finished.emit(results)
        except Exception as e:
            self.error.emit(str(e))
