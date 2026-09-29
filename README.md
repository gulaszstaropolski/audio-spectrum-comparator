# Audio Spectrum Comparator

Compare a mix with a reference track using interactive, browser-based audio
analysis. The web app processes audio locally with the Web Audio API; files are
not uploaded to a server.

## Browser app

Open the deployed app at
[gulaszstaropolski.github.io/audio-spectrum-comparator](https://gulaszstaropolski.github.io/audio-spectrum-comparator/),
or run it locally:

```bash
cd web
npm ci
npm run dev
```

Choose a reference and a mix, optionally normalize their RMS loudness, then run
the analysis. Supported audio formats depend on the browser's Web Audio API
decoder; WAV, MP3, FLAC, OGG, and M4A are commonly supported.

The analysis includes:

- A time-frequency heatmap from 20 Hz to 20 kHz (red: mix louder, blue: mix quieter)
- An interactive spectrum overlay and seven frequency-band comparisons
- Numerical spectrum data with CSV export
- PNG/SVG chart downloads, print-to-PDF, local saved sessions, and audio preview
- Responsive dark/light themes

GitHub Pages deployment is configured in
`.github/workflows/deploy-pages.yml`. It builds the static files in `web/dist`;
no backend or uploaded audio files are involved.

## Legacy desktop app

The original Python/PyQt5 desktop app remains available:

```bash
pip install -r requirements.txt
python main.py
```

## License

MIT
