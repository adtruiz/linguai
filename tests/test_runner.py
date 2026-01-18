"""
LinguAI Comprehensive Test Runner
Generates test data, runs all tests, and logs results.
"""

import os
import sys
import json
import time
import wave
import struct
import math
import tempfile
import subprocess
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional
import urllib.request
import urllib.error

# Test configuration
TEST_DIR = Path(__file__).parent
DATA_DIR = TEST_DIR / "data"
LOGS_DIR = TEST_DIR / "logs"
BACKEND_URL = "http://localhost:8000"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)


@dataclass
class TestResult:
    """Single test result"""
    name: str
    phase: str
    status: str  # PASS, FAIL, SKIP, ERROR
    duration_ms: float
    message: str = ""
    details: dict = field(default_factory=dict)


@dataclass
class TestReport:
    """Full test report"""
    timestamp: str
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    errors: int = 0
    duration_ms: float = 0
    results: list = field(default_factory=list)

    def add_result(self, result: TestResult):
        self.results.append(asdict(result))
        self.total_tests += 1
        if result.status == "PASS":
            self.passed += 1
        elif result.status == "FAIL":
            self.failed += 1
        elif result.status == "SKIP":
            self.skipped += 1
        else:
            self.errors += 1

    def save(self, filename: str):
        filepath = LOGS_DIR / filename
        with open(filepath, "w") as f:
            json.dump(asdict(self), f, indent=2)
        return filepath


class TestLogger:
    """Logger for test output"""

    def __init__(self, log_file: Path):
        self.log_file = log_file
        self.log_file.parent.mkdir(exist_ok=True)
        self._write(f"\n{'='*60}")
        self._write(f"LinguAI Test Run - {datetime.now().isoformat()}")
        self._write(f"{'='*60}\n")

    def _write(self, msg: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        line = f"[{timestamp}] {msg}"
        print(line)
        with open(self.log_file, "a") as f:
            f.write(line + "\n")

    def info(self, msg: str):
        self._write(f"INFO: {msg}")

    def success(self, msg: str):
        self._write(f"✅ PASS: {msg}")

    def fail(self, msg: str):
        self._write(f"❌ FAIL: {msg}")

    def error(self, msg: str):
        self._write(f"🔥 ERROR: {msg}")

    def skip(self, msg: str):
        self._write(f"⏭️ SKIP: {msg}")

    def section(self, title: str):
        self._write(f"\n{'─'*40}")
        self._write(f"  {title}")
        self._write(f"{'─'*40}")


# ============================================================
# AUDIO FILE GENERATORS
# ============================================================

def generate_sine_wave(filename: str, frequency: float = 440.0,
                       duration: float = 2.0, sample_rate: int = 44100) -> Path:
    """Generate a simple sine wave WAV file"""
    filepath = DATA_DIR / filename

    n_samples = int(duration * sample_rate)

    with wave.open(str(filepath), 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)

        for i in range(n_samples):
            t = i / sample_rate
            value = int(32767 * 0.5 * math.sin(2 * math.pi * frequency * t))
            wav_file.writeframes(struct.pack('<h', value))

    return filepath


def generate_multi_tone(filename: str, frequencies: list = [261.63, 329.63, 392.00],
                        duration: float = 3.0, sample_rate: int = 44100) -> Path:
    """Generate a multi-tone WAV file (like a chord)"""
    filepath = DATA_DIR / filename

    n_samples = int(duration * sample_rate)

    with wave.open(str(filepath), 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for i in range(n_samples):
            t = i / sample_rate
            value = sum(math.sin(2 * math.pi * f * t) for f in frequencies)
            value = int(32767 * 0.3 * value / len(frequencies))
            wav_file.writeframes(struct.pack('<h', value))

    return filepath


def generate_speech_like(filename: str, duration: float = 2.0,
                         sample_rate: int = 44100) -> Path:
    """Generate a speech-like formant pattern (F1~500Hz, F2~1500Hz, F3~2500Hz)"""
    filepath = DATA_DIR / filename

    n_samples = int(duration * sample_rate)
    formants = [500, 1500, 2500]  # Approximate vowel formants
    bandwidths = [50, 100, 150]

    with wave.open(str(filepath), 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for i in range(n_samples):
            t = i / sample_rate
            # Fundamental frequency with vibrato
            f0 = 120 + 5 * math.sin(2 * math.pi * 5 * t)

            # Generate harmonics filtered by formants
            value = 0
            for harmonic in range(1, 20):
                h_freq = f0 * harmonic
                amplitude = 1.0 / harmonic

                # Apply formant resonances
                for f, bw in zip(formants, bandwidths):
                    resonance = 1.0 / (1.0 + ((h_freq - f) / bw) ** 2)
                    amplitude *= (1 + 2 * resonance)

                value += amplitude * math.sin(2 * math.pi * h_freq * t)

            value = int(32767 * 0.1 * value)
            value = max(-32767, min(32767, value))
            wav_file.writeframes(struct.pack('<h', value))

    return filepath


def generate_silence(filename: str, duration: float = 1.0,
                     sample_rate: int = 44100) -> Path:
    """Generate a silent WAV file"""
    filepath = DATA_DIR / filename

    n_samples = int(duration * sample_rate)

    with wave.open(str(filepath), 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for _ in range(n_samples):
            wav_file.writeframes(struct.pack('<h', 0))

    return filepath


def generate_all_test_audio():
    """Generate all test audio files"""
    files = {}

    # Simple sine wave (440Hz - A4 note)
    files['sine_440hz'] = generate_sine_wave("sine_440hz.wav", 440, 2.0)

    # Low frequency (100Hz - good for pitch tracking)
    files['sine_100hz'] = generate_sine_wave("sine_100hz.wav", 100, 2.0)

    # High frequency (2000Hz)
    files['sine_2000hz'] = generate_sine_wave("sine_2000hz.wav", 2000, 2.0)

    # Multi-tone (C major chord)
    files['chord'] = generate_multi_tone("chord.wav")

    # Speech-like formant pattern
    files['speech_like'] = generate_speech_like("speech_like.wav", 3.0)

    # Silence (for edge case testing)
    files['silence'] = generate_silence("silence.wav", 1.0)

    # Long file (10 seconds for stress testing)
    files['long_file'] = generate_speech_like("long_10s.wav", 10.0)

    return files


# ============================================================
# TEST FIXTURES
# ============================================================

def create_test_annotation_json() -> Path:
    """Create a test annotation JSON file"""
    filepath = DATA_DIR / "test_annotations.json"

    data = {
        "duration": 3.0,
        "tiers": [
            {
                "name": "phonemes",
                "tier_type": "interval",
                "annotations": [
                    {"id": "1", "start": 0.0, "end": 0.5, "text": "h"},
                    {"id": "2", "start": 0.5, "end": 0.8, "text": "ɛ"},
                    {"id": "3", "start": 0.8, "end": 1.2, "text": "l"},
                    {"id": "4", "start": 1.2, "end": 1.6, "text": "oʊ"},
                ]
            },
            {
                "name": "words",
                "tier_type": "interval",
                "annotations": [
                    {"id": "5", "start": 0.0, "end": 1.6, "text": "hello"},
                ]
            }
        ]
    }

    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

    return filepath


def create_test_textgrid() -> Path:
    """Create a test TextGrid file"""
    filepath = DATA_DIR / "test.TextGrid"

    content = '''File type = "ooTextFile"
Object class = "TextGrid"

xmin = 0
xmax = 3.0
tiers? <exists>
size = 2
item []:
    item [1]:
        class = "IntervalTier"
        name = "phonemes"
        xmin = 0
        xmax = 3.0
        intervals: size = 4
        intervals [1]:
            xmin = 0.0
            xmax = 0.5
            text = "h"
        intervals [2]:
            xmin = 0.5
            xmax = 0.8
            text = "ɛ"
        intervals [3]:
            xmin = 0.8
            xmax = 1.2
            text = "l"
        intervals [4]:
            xmin = 1.2
            xmax = 1.6
            text = "oʊ"
    item [2]:
        class = "IntervalTier"
        name = "words"
        xmin = 0
        xmax = 3.0
        intervals: size = 1
        intervals [1]:
            xmin = 0.0
            xmax = 1.6
            text = "hello"
'''

    with open(filepath, "w") as f:
        f.write(content)

    return filepath


def create_invalid_file() -> Path:
    """Create an invalid file for error testing"""
    filepath = DATA_DIR / "invalid.wav"
    with open(filepath, "w") as f:
        f.write("This is not a valid WAV file")
    return filepath


# ============================================================
# API TEST HELPERS
# ============================================================

def api_request(endpoint: str, method: str = "GET",
                data: bytes = None, files: dict = None) -> tuple:
    """Make an API request and return (status_code, response_data)"""
    url = f"{BACKEND_URL}{endpoint}"

    try:
        if files:
            # Multipart form data for file upload
            import io
            boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
            body = b""

            for key, (filename, content, content_type) in files.items():
                body += f"--{boundary}\r\n".encode()
                body += f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode()
                body += f"Content-Type: {content_type}\r\n\r\n".encode()
                body += content
                body += b"\r\n"

            body += f"--{boundary}--\r\n".encode()

            req = urllib.request.Request(url, data=body, method=method)
            req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        else:
            req = urllib.request.Request(url, data=data, method=method)
            if data:
                req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, json.loads(response.read().decode())

    except urllib.error.HTTPError as e:
        return e.code, {"error": str(e)}
    except urllib.error.URLError as e:
        return 0, {"error": f"Connection failed: {e.reason}"}
    except Exception as e:
        return 0, {"error": str(e)}


def upload_file_to_api(endpoint: str, filepath: Path) -> tuple:
    """Upload a file to an API endpoint"""
    with open(filepath, "rb") as f:
        content = f.read()

    files = {
        "file": (filepath.name, content, "audio/wav")
    }

    return api_request(endpoint, method="POST", files=files)


# ============================================================
# TEST PHASES
# ============================================================

def run_phase_a_backend_tests(logger: TestLogger, report: TestReport):
    """Phase A: Backend API Tests"""
    logger.section("PHASE A: Backend API Tests")

    # A1: Health endpoint
    test_name = "A1: Health endpoint"
    start = time.time()
    try:
        status, data = api_request("/health")
        duration = (time.time() - start) * 1000

        if status == 200 and data.get("status") == "healthy":
            logger.success(test_name)
            report.add_result(TestResult(test_name, "A", "PASS", duration))
        else:
            logger.fail(f"{test_name} - status={status}, data={data}")
            report.add_result(TestResult(test_name, "A", "FAIL", duration,
                                        message=f"Unexpected response: {data}"))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "A", "ERROR", duration, message=str(e)))

    # A2: Spectrogram analysis
    test_name = "A2: Spectrogram analysis"
    start = time.time()
    try:
        audio_file = DATA_DIR / "sine_440hz.wav"
        if not audio_file.exists():
            logger.skip(f"{test_name} - audio file not found")
            report.add_result(TestResult(test_name, "A", "SKIP", 0,
                                        message="Audio file not generated"))
        else:
            status, data = upload_file_to_api("/api/v1/analyze/spectrogram", audio_file)
            duration = (time.time() - start) * 1000

            if status == 200 and "times" in data and "frequencies" in data and "intensities" in data:
                logger.success(f"{test_name} - {len(data['times'])} frames, {len(data['frequencies'])} freq bins")
                report.add_result(TestResult(test_name, "A", "PASS", duration,
                                            details={"frames": len(data['times']),
                                                    "freq_bins": len(data['frequencies'])}))
            else:
                logger.fail(f"{test_name} - status={status}")
                report.add_result(TestResult(test_name, "A", "FAIL", duration,
                                            message=f"status={status}, keys={list(data.keys()) if isinstance(data, dict) else 'N/A'}"))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "A", "ERROR", duration, message=str(e)))

    # A3: Formant analysis
    test_name = "A3: Formant analysis"
    start = time.time()
    try:
        audio_file = DATA_DIR / "speech_like.wav"
        if not audio_file.exists():
            logger.skip(f"{test_name} - audio file not found")
            report.add_result(TestResult(test_name, "A", "SKIP", 0))
        else:
            status, data = upload_file_to_api("/api/v1/analyze/formants", audio_file)
            duration = (time.time() - start) * 1000

            if status == 200 and all(k in data for k in ["times", "f1", "f2", "f3", "f4"]):
                # Check that we got some formant values
                f1_values = [v for v in data['f1'] if v is not None]
                logger.success(f"{test_name} - {len(data['times'])} frames, {len(f1_values)} F1 values")
                report.add_result(TestResult(test_name, "A", "PASS", duration,
                                            details={"frames": len(data['times']),
                                                    "f1_count": len(f1_values)}))
            else:
                logger.fail(f"{test_name} - status={status}")
                report.add_result(TestResult(test_name, "A", "FAIL", duration,
                                            message=f"status={status}"))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "A", "ERROR", duration, message=str(e)))

    # A4: Pitch analysis
    test_name = "A4: Pitch analysis"
    start = time.time()
    try:
        audio_file = DATA_DIR / "sine_100hz.wav"
        if not audio_file.exists():
            logger.skip(f"{test_name} - audio file not found")
            report.add_result(TestResult(test_name, "A", "SKIP", 0))
        else:
            status, data = upload_file_to_api("/api/v1/analyze/pitch", audio_file)
            duration = (time.time() - start) * 1000

            if status == 200 and "times" in data and "frequencies" in data:
                # Check pitch values are reasonable for 100Hz sine
                pitch_values = [v for v in data['frequencies'] if v is not None]
                avg_pitch = sum(pitch_values) / len(pitch_values) if pitch_values else 0

                if 80 < avg_pitch < 120:  # Should be around 100Hz
                    logger.success(f"{test_name} - avg pitch={avg_pitch:.1f}Hz (expected ~100Hz)")
                    report.add_result(TestResult(test_name, "A", "PASS", duration,
                                                details={"avg_pitch": avg_pitch}))
                else:
                    logger.fail(f"{test_name} - avg pitch={avg_pitch:.1f}Hz (expected ~100Hz)")
                    report.add_result(TestResult(test_name, "A", "FAIL", duration,
                                                message=f"Pitch {avg_pitch:.1f}Hz outside expected range"))
            else:
                logger.fail(f"{test_name} - status={status}")
                report.add_result(TestResult(test_name, "A", "FAIL", duration,
                                            message=f"status={status}"))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "A", "ERROR", duration, message=str(e)))

    # A5: Error handling (invalid file)
    test_name = "A5: Error handling (invalid file)"
    start = time.time()
    try:
        invalid_file = DATA_DIR / "invalid.wav"
        if not invalid_file.exists():
            create_invalid_file()

        status, data = upload_file_to_api("/api/v1/analyze/spectrogram", invalid_file)
        duration = (time.time() - start) * 1000

        if status >= 400:  # Should return an error status
            logger.success(f"{test_name} - correctly returned error status {status}")
            report.add_result(TestResult(test_name, "A", "PASS", duration,
                                        details={"error_status": status}))
        else:
            logger.fail(f"{test_name} - should have returned error, got {status}")
            report.add_result(TestResult(test_name, "A", "FAIL", duration,
                                        message=f"Expected error status, got {status}"))
    except Exception as e:
        duration = (time.time() - start) * 1000
        # An exception is acceptable for invalid input
        logger.success(f"{test_name} - correctly raised exception")
        report.add_result(TestResult(test_name, "A", "PASS", duration,
                                    message=f"Raised: {type(e).__name__}"))


def run_phase_b_frontend_tests(logger: TestLogger, report: TestReport):
    """Phase B: Frontend Component Tests (build verification)"""
    logger.section("PHASE B: Frontend Build & Type Check")

    frontend_dir = Path(__file__).parent.parent / "frontend"

    # B1: TypeScript compilation
    test_name = "B1: TypeScript compilation"
    start = time.time()
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            timeout=120
        )
        duration = (time.time() - start) * 1000

        if result.returncode == 0:
            logger.success(f"{test_name} - build successful")
            report.add_result(TestResult(test_name, "B", "PASS", duration))
        else:
            logger.fail(f"{test_name} - {result.stderr[:200]}")
            report.add_result(TestResult(test_name, "B", "FAIL", duration,
                                        message=result.stderr[:500]))
    except subprocess.TimeoutExpired:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - timeout")
        report.add_result(TestResult(test_name, "B", "ERROR", duration, message="Build timeout"))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "B", "ERROR", duration, message=str(e)))

    # B2: Check required components exist
    test_name = "B2: Required components exist"
    start = time.time()
    required_components = [
        "components/SpectrogramViewer/SpectrogramViewer.tsx",
        "components/SpectrogramViewer/SpectrogramCanvas.tsx",
        "components/AnnotationPanel/AnnotationPanel.tsx",
        "components/AudioPlayer/AudioPlayer.tsx",
        "components/Toolbar/Toolbar.tsx",
        "services/api.ts",
        "types/api.ts",
    ]

    missing = []
    for component in required_components:
        if not (frontend_dir / "src" / component).exists():
            missing.append(component)

    duration = (time.time() - start) * 1000

    if not missing:
        logger.success(f"{test_name} - all {len(required_components)} components found")
        report.add_result(TestResult(test_name, "B", "PASS", duration,
                                    details={"component_count": len(required_components)}))
    else:
        logger.fail(f"{test_name} - missing: {missing}")
        report.add_result(TestResult(test_name, "B", "FAIL", duration,
                                    message=f"Missing: {', '.join(missing)}"))


def run_phase_c_integration_tests(logger: TestLogger, report: TestReport):
    """Phase C: Integration Tests"""
    logger.section("PHASE C: Integration Tests")

    # C1: Backend readiness check
    test_name = "C1: Backend ready with Parselmouth"
    start = time.time()
    try:
        status, data = api_request("/health/ready")
        duration = (time.time() - start) * 1000

        if status == 200 and data.get("checks", {}).get("parselmouth"):
            logger.success(f"{test_name}")
            report.add_result(TestResult(test_name, "C", "PASS", duration))
        else:
            logger.fail(f"{test_name} - Parselmouth not available")
            report.add_result(TestResult(test_name, "C", "FAIL", duration,
                                        message="Parselmouth check failed"))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "C", "ERROR", duration, message=str(e)))

    # C2: Full spectrogram workflow
    test_name = "C2: Full spectrogram workflow"
    start = time.time()
    try:
        # Upload and analyze
        audio_file = DATA_DIR / "speech_like.wav"
        status, data = upload_file_to_api("/api/v1/analyze/spectrogram", audio_file)

        if status != 200:
            raise Exception(f"Spectrogram failed: {status}")

        # Verify data structure
        assert "times" in data, "Missing times"
        assert "frequencies" in data, "Missing frequencies"
        assert "intensities" in data, "Missing intensities"
        assert len(data["intensities"]) == len(data["times"]), "Dimension mismatch"
        assert data["duration"] > 0, "Invalid duration"

        duration = (time.time() - start) * 1000
        logger.success(f"{test_name} - {data['duration']:.2f}s audio analyzed")
        report.add_result(TestResult(test_name, "C", "PASS", duration,
                                    details={"duration": data["duration"],
                                            "frames": len(data["times"])}))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.fail(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "C", "FAIL", duration, message=str(e)))


def run_phase_d_edge_case_tests(logger: TestLogger, report: TestReport):
    """Phase D: Edge Case Tests"""
    logger.section("PHASE D: Edge Case & Stress Tests")

    # D1: Long file processing
    test_name = "D1: Long file (10s) processing"
    start = time.time()
    try:
        audio_file = DATA_DIR / "long_10s.wav"
        if not audio_file.exists():
            logger.skip(f"{test_name} - file not found")
            report.add_result(TestResult(test_name, "D", "SKIP", 0))
        else:
            status, data = upload_file_to_api("/api/v1/analyze/spectrogram", audio_file)
            duration = (time.time() - start) * 1000

            if status == 200 and data.get("duration", 0) >= 9.0:
                logger.success(f"{test_name} - processed in {duration:.0f}ms")
                report.add_result(TestResult(test_name, "D", "PASS", duration,
                                            details={"processing_time_ms": duration}))
            else:
                logger.fail(f"{test_name} - status={status}")
                report.add_result(TestResult(test_name, "D", "FAIL", duration))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "D", "ERROR", duration, message=str(e)))

    # D2: Silent file handling
    test_name = "D2: Silent file handling"
    start = time.time()
    try:
        audio_file = DATA_DIR / "silence.wav"
        if not audio_file.exists():
            logger.skip(f"{test_name} - file not found")
            report.add_result(TestResult(test_name, "D", "SKIP", 0))
        else:
            status, data = upload_file_to_api("/api/v1/analyze/pitch", audio_file)
            duration = (time.time() - start) * 1000

            if status == 200:
                # Silent file should have mostly None pitch values
                pitch_values = [v for v in data.get('frequencies', []) if v is not None]
                logger.success(f"{test_name} - {len(pitch_values)} voiced frames (expected ~0)")
                report.add_result(TestResult(test_name, "D", "PASS", duration,
                                            details={"voiced_frames": len(pitch_values)}))
            else:
                logger.fail(f"{test_name} - status={status}")
                report.add_result(TestResult(test_name, "D", "FAIL", duration))
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(f"{test_name} - {e}")
        report.add_result(TestResult(test_name, "D", "ERROR", duration, message=str(e)))


# ============================================================
# MAIN
# ============================================================

def main():
    """Run all tests"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = LOGS_DIR / f"test_run_{timestamp}.log"
    report_file = f"test_report_{timestamp}.json"

    logger = TestLogger(log_file)
    report = TestReport(timestamp=timestamp)

    overall_start = time.time()

    # Generate test data
    logger.section("SETUP: Generating Test Data")
    try:
        files = generate_all_test_audio()
        logger.info(f"Generated {len(files)} audio test files")

        create_test_annotation_json()
        create_test_textgrid()
        create_invalid_file()
        logger.info("Generated annotation fixtures")
    except Exception as e:
        logger.error(f"Failed to generate test data: {e}")
        return 1

    # Check if backend is running
    logger.section("SETUP: Checking Backend")
    status, _ = api_request("/health")
    if status != 200:
        logger.error(f"Backend not running at {BACKEND_URL}")
        logger.info("Start backend with: cd backend && source venv/bin/activate && uvicorn app.main:app --reload")
        return 1
    logger.info("Backend is running")

    # Run test phases
    run_phase_a_backend_tests(logger, report)
    run_phase_b_frontend_tests(logger, report)
    run_phase_c_integration_tests(logger, report)
    run_phase_d_edge_case_tests(logger, report)

    # Summary
    report.duration_ms = (time.time() - overall_start) * 1000

    logger.section("TEST SUMMARY")
    logger.info(f"Total: {report.total_tests}")
    logger.info(f"Passed: {report.passed}")
    logger.info(f"Failed: {report.failed}")
    logger.info(f"Skipped: {report.skipped}")
    logger.info(f"Errors: {report.errors}")
    logger.info(f"Duration: {report.duration_ms:.0f}ms")

    # Save report
    saved_path = report.save(report_file)
    logger.info(f"Report saved to: {saved_path}")
    logger.info(f"Log saved to: {log_file}")

    return 0 if report.failed == 0 and report.errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
