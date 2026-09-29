import sys
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QFileDialog, QProgressBar, QTabWidget
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import numpy as np
from audio_analyzer import AudioAnalyzer, AnalysisWorker

class SpectrumComparatorApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.reference_file = None
        self.mix_file = None
        self.analyzer = AudioAnalyzer()
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle('Audio Spectrum Comparator - Professional Analysis')
        self.setGeometry(100, 100, 1400, 900)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout()
        
        # File selection section
        file_section = QHBoxLayout()
        
        self.ref_label = QLabel('Reference: Not loaded')
        self.ref_label.setFont(QFont('Arial', 10))
        ref_btn = QPushButton('Load Reference')
        ref_btn.clicked.connect(self.load_reference)
        file_section.addWidget(QLabel('Reference File:'))
        file_section.addWidget(self.ref_label)
        file_section.addWidget(ref_btn)
        
        file_section.addSpacing(20)
        
        self.mix_label = QLabel('Mix: Not loaded')
        self.mix_label.setFont(QFont('Arial', 10))
        mix_btn = QPushButton('Load Mix')
        mix_btn.clicked.connect(self.load_mix)
        file_section.addWidget(QLabel('Mix File:'))
        file_section.addWidget(self.mix_label)
        file_section.addWidget(mix_btn)
        
        main_layout.addLayout(file_section)
        
        # Analysis button
        analyze_btn = QPushButton('Analyze & Compare')
        analyze_btn.setFont(QFont('Arial', 11, QFont.Bold))
        analyze_btn.setStyleSheet("background-color: #4CAF50; color: white; padding: 10px;")
        analyze_btn.clicked.connect(self.run_analysis)
        main_layout.addWidget(analyze_btn)
        
        # Progress bar
        self.progress = QProgressBar()
        self.progress.setVisible(False)
        main_layout.addWidget(self.progress)
        
        # Tabs for different visualizations
        self.tabs = QTabWidget()
        
        # Tab 1: Difference Heatmap
        self.heatmap_fig = Figure(figsize=(14, 6), dpi=100)
        self.heatmap_canvas = FigureCanvas(self.heatmap_fig)
        self.tabs.addTab(self.heatmap_canvas, 'Difference Heatmap (dB)')
        
        # Tab 2: Spectrum Overlay
        self.overlay_fig = Figure(figsize=(14, 6), dpi=100)
        self.overlay_canvas = FigureCanvas(self.overlay_fig)
        self.tabs.addTab(self.overlay_canvas, 'Spectrum Overlay')
        
        # Tab 3: Numerical Data
        self.data_fig = Figure(figsize=(14, 6), dpi=100)
        self.data_canvas = FigureCanvas(self.data_fig)
        self.tabs.addTab(self.data_canvas, 'Frequency Band Differences (dB)')
        
        main_layout.addWidget(self.tabs)
        
        central_widget.setLayout(main_layout)

    def load_reference(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, 'Select Reference Audio', '',
            'Audio Files (*.wav *.mp3 *.flac);;All Files (*)'
        )
        if file_path:
            self.reference_file = file_path
            filename = file_path.split('/')[-1]
            self.ref_label.setText(f'✓ {filename}')
            self.ref_label.setStyleSheet('color: green;')

    def load_mix(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, 'Select Mix Audio', '',
            'Audio Files (*.wav *.mp3 *.flac);;All Files (*)'
        )
        if file_path:
            self.mix_file = file_path
            filename = file_path.split('/')[-1]
            self.mix_label.setText(f'✓ {filename}')
            self.mix_label.setStyleSheet('color: green;')

    def run_analysis(self):
        if not self.reference_file or not self.mix_file:
            self.ref_label.setText('Error: Load both files')
            self.ref_label.setStyleSheet('color: red;')
            return
        
        self.progress.setVisible(True)
        self.progress.setValue(0)
        
        self.worker_thread = QThread()
        self.worker = AnalysisWorker(self.reference_file, self.mix_file, self.analyzer)
        self.worker.moveToThread(self.worker_thread)
        
        self.worker.progress.connect(self.on_progress)
        self.worker.finished.connect(self.on_analysis_complete)
        self.worker.error.connect(self.on_error)
        
        self.worker_thread.started.connect(self.worker.run)
        self.worker_thread.start()

    def on_progress(self, value):
        self.progress.setValue(value)

    def on_analysis_complete(self, results):
        self.progress.setVisible(False)
        self.display_results(results)

    def on_error(self, error_msg):
        self.progress.setVisible(False)
        self.ref_label.setText(f'Error: {error_msg}')
        self.ref_label.setStyleSheet('color: red;')

    def display_results(self, results):
        freqs = results['freqs']
        diff_db = results['diff_db']
        ref_spectrum = results['ref_spectrum']
        mix_spectrum = results['mix_spectrum']
        time_axis = results['time_axis']
        diff_spectrogram = results['diff_spectrogram']
        band_diffs = results['band_diffs']
        
        # Tab 1: Difference Heatmap
        self.heatmap_fig.clear()
        ax = self.heatmap_fig.add_subplot(111)
        
        im = ax.imshow(diff_spectrogram, aspect='auto', origin='lower',
                       extent=[time_axis[0], time_axis[-1], freqs[0], freqs[-1]],
                       cmap='RdBu_r', vmin=-12, vmax=12)
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('Frequency (Hz)')
        ax.set_title('Spectrum Difference (Red=Mix Too Loud, Blue=Mix Too Quiet)')
        ax.set_yscale('log')
        cbar = self.heatmap_fig.colorbar(im, ax=ax)
        cbar.set_label('Difference (dB)')
        self.heatmap_canvas.draw()
        
        # Tab 2: Spectrum Overlay
        self.overlay_fig.clear()
        ax = self.overlay_fig.add_subplot(111)
        
        ax.semilogx(freqs, ref_spectrum, label='Reference', linewidth=2, color='blue')
        ax.semilogx(freqs, mix_spectrum, label='Mix', linewidth=2, color='red', alpha=0.7)
        ax.set_xlabel('Frequency (Hz)')
        ax.set_ylabel('Magnitude (dB)')
        ax.set_title('Spectrum Comparison')
        ax.legend()
        ax.grid(True, alpha=0.3)
        self.overlay_canvas.draw()
        
        # Tab 3: Frequency Band Differences
        self.data_fig.clear()
        ax = self.data_fig.add_subplot(111)
        
        band_names = list(band_diffs.keys())
        band_values = list(band_diffs.values())
        colors = ['red' if v > 0 else 'blue' for v in band_values]
        
        ax.bar(band_names, band_values, color=colors, alpha=0.7)
        ax.axhline(y=0, color='black', linestyle='-', linewidth=0.8)
        ax.set_ylabel('Difference (dB)')
        ax.set_title('Frequency Band Differences (Mix vs Reference)')
        ax.grid(True, alpha=0.3, axis='y')
        
        # Add value labels on bars
        for i, (name, value) in enumerate(zip(band_names, band_values)):
            ax.text(i, value + (0.3 if value > 0 else -0.3), f'{value:.1f}dB',
                   ha='center', va='bottom' if value > 0 else 'top', fontsize=9)
        
        self.data_fig.tight_layout()
        self.data_canvas.draw()

def main():
    app = QApplication(sys.argv)
    window = SpectrumComparatorApp()
    window.show()
    sys.exit(app.exec_())

if __name__ == '__main__':
    main()
