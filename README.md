# Audio Spectrum Comparator

Professional desktop application for analyzing and comparing audio spectra between a reference track and your mix.

## Features

- **Precise FFT Analysis**: 4096-point FFT for high-frequency resolution
- **Automatic Silence Removal**: Trims silence at beginning and end of tracks
- **Loudness Normalization**: Normalizes mix to reference loudness for fair comparison
- **Difference Heatmap**: Color-coded visualization showing where mix differs from reference (Red=Too Loud, Blue=Too Quiet)
- **Spectrum Overlay**: Direct comparison of both spectra
- **Frequency Band Analysis**: Numerical dB differences across 7 standard frequency bands
- **Time-Frequency Analysis**: See how differences change over time

## Installation

### Prerequisites
- Python 3.8 or higher
- Windows, macOS, or Linux

### Setup

1. Clone the repository:
```bash
git clone https://github.com/gulaszstaropolski/audio-spectrum-comparator.git
cd audio-spectrum-comparator
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Run the application:
```bash
python main.py
```

2. Load your reference track (professional mix you want to match)

3. Load your mix (your track to compare)

4. Click "Analyze & Compare"

5. Review the results:
   - **Heatmap**: Visual representation of frequency/time differences
   - **Overlay**: See both spectra superimposed
   - **Band Differences**: Exact dB values for each frequency range

## Supported Formats

- WAV (recommended for highest quality)
- MP3
- FLAC
- OGG
- And more (via librosa)

## Frequency Bands

- **Sub-bass**: 20-60 Hz
- **Bass**: 60-250 Hz
- **Low-Mid**: 250-500 Hz
- **Mid**: 500 Hz-2 kHz
- **Upper-Mid**: 2k-4 kHz
- **Presence**: 4k-8 kHz
- **Brilliance**: 8k-16 kHz

## Technical Details

- FFT Size: 4096 samples
- Hop Length: 512 samples
- Sample Rate: 44100 Hz (resampled if needed)
- Window: Hann window
- Normalization: RMS-based to match loudness

## Contributing

Feel free to fork and submit improvements!

## License

MIT
