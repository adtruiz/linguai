"""
LinguAI Stress Test Runner
Runs all 48 test files through the backend API and validates results.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any

# Configuration
TEST_DIR = Path(__file__).parent
BATCH_DIR = TEST_DIR / "data" / "stress_test_batches"
LOGS_DIR = TEST_DIR / "logs"
BACKEND_URL = "http://localhost:8000"

LOGS_DIR.mkdir(exist_ok=True)


@dataclass
class TestResult:
    """Single test result"""
    file_name: str
    batch: str
    endpoint: str
    status: str  # PASS, FAIL, ERROR, TIMEOUT
    duration_ms: float
    file_size_kb: float
    message: str = ""
    details: dict = field(default_factory=dict)


@dataclass
class StressTestReport:
    """Full stress test report"""
    timestamp: str
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    errors: int = 0
    timeouts: int = 0
    total_duration_ms: float = 0
    total_data_processed_mb: float = 0
    results: List[Dict] = field(default_factory=list)
    summary_by_batch: Dict[str, Dict] = field(default_factory=dict)
    summary_by_endpoint: Dict[str, Dict] = field(default_factory=dict)

    def add_result(self, result: TestResult):
        self.results.append(asdict(result))
        self.total_tests += 1
        self.total_data_processed_mb += result.file_size_kb / 1024

        if result.status == "PASS":
            self.passed += 1
        elif result.status == "FAIL":
            self.failed += 1
        elif result.status == "TIMEOUT":
            self.timeouts += 1
        else:
            self.errors += 1

        # Update batch summary
        if result.batch not in self.summary_by_batch:
            self.summary_by_batch[result.batch] = {"total": 0, "passed": 0, "failed": 0}
        self.summary_by_batch[result.batch]["total"] += 1
        if result.status == "PASS":
            self.summary_by_batch[result.batch]["passed"] += 1
        else:
            self.summary_by_batch[result.batch]["failed"] += 1

        # Update endpoint summary
        if result.endpoint not in self.summary_by_endpoint:
            self.summary_by_endpoint[result.endpoint] = {"total": 0, "passed": 0, "avg_ms": 0}
        self.summary_by_endpoint[result.endpoint]["total"] += 1
        if result.status == "PASS":
            self.summary_by_endpoint[result.endpoint]["passed"] += 1
            # Running average
            n = self.summary_by_endpoint[result.endpoint]["passed"]
            old_avg = self.summary_by_endpoint[result.endpoint]["avg_ms"]
            self.summary_by_endpoint[result.endpoint]["avg_ms"] = (
                (old_avg * (n - 1) + result.duration_ms) / n
            )

    def save(self, filename: str) -> Path:
        filepath = LOGS_DIR / filename
        with open(filepath, "w") as f:
            json.dump(asdict(self), f, indent=2)
        return filepath


class StressTestLogger:
    """Logger for stress test output"""

    def __init__(self, log_file: Path):
        self.log_file = log_file
        self.log_file.parent.mkdir(exist_ok=True)
        self._write(f"\n{'='*70}")
        self._write(f"LinguAI Stress Test - {datetime.now().isoformat()}")
        self._write(f"{'='*70}\n")

    def _write(self, msg: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        line = f"[{timestamp}] {msg}"
        print(line)
        with open(self.log_file, "a") as f:
            f.write(line + "\n")

    def info(self, msg: str):
        self._write(f"INFO: {msg}")

    def success(self, msg: str):
        self._write(f"✅ {msg}")

    def fail(self, msg: str):
        self._write(f"❌ {msg}")

    def error(self, msg: str):
        self._write(f"🔥 {msg}")

    def timeout(self, msg: str):
        self._write(f"⏱️ {msg}")

    def section(self, title: str):
        self._write(f"\n{'─'*50}")
        self._write(f"  {title}")
        self._write(f"{'─'*50}")


def upload_file_to_api(endpoint: str, filepath: Path, timeout: int = 60) -> tuple:
    """Upload a file to an API endpoint and return (status_code, response_data, duration_ms)"""
    url = f"{BACKEND_URL}{endpoint}"

    with open(filepath, "rb") as f:
        content = f.read()

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = b""
    body += f"--{boundary}\r\n".encode()
    body += f'Content-Disposition: form-data; name="file"; filename="{filepath.name}"\r\n'.encode()
    body += b"Content-Type: audio/wav\r\n\r\n"
    body += content
    body += b"\r\n"
    body += f"--{boundary}--\r\n".encode()

    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            duration_ms = (time.time() - start) * 1000
            return response.status, json.loads(response.read().decode()), duration_ms
    except urllib.error.HTTPError as e:
        duration_ms = (time.time() - start) * 1000
        try:
            error_body = json.loads(e.read().decode())
        except:
            error_body = {"error": str(e)}
        return e.code, error_body, duration_ms
    except urllib.error.URLError as e:
        duration_ms = (time.time() - start) * 1000
        return 0, {"error": f"Connection failed: {e.reason}"}, duration_ms
    except TimeoutError:
        duration_ms = (time.time() - start) * 1000
        return 0, {"error": "Request timed out"}, duration_ms
    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        return 0, {"error": str(e)}, duration_ms


def validate_spectrogram_response(data: dict, file_size_kb: float) -> tuple:
    """Validate spectrogram response data. Returns (is_valid, message, details)"""
    required_keys = ["times", "frequencies", "intensities", "duration", "sample_rate"]

    for key in required_keys:
        if key not in data:
            return False, f"Missing key: {key}", {}

    if not data["times"] or not data["frequencies"]:
        return False, "Empty times or frequencies", {}

    if len(data["intensities"]) != len(data["times"]):
        return False, f"Dimension mismatch: {len(data['intensities'])} vs {len(data['times'])}", {}

    if data["duration"] <= 0:
        return False, f"Invalid duration: {data['duration']}", {}

    details = {
        "frames": len(data["times"]),
        "freq_bins": len(data["frequencies"]),
        "duration": data["duration"],
        "sample_rate": data["sample_rate"]
    }

    return True, "Valid", details


def validate_formants_response(data: dict) -> tuple:
    """Validate formants response data."""
    required_keys = ["times", "f1", "f2", "f3", "f4"]

    for key in required_keys:
        if key not in data:
            return False, f"Missing key: {key}", {}

    if not data["times"]:
        return False, "Empty times array", {}

    # Count valid formant values
    f1_valid = len([v for v in data["f1"] if v is not None])
    f2_valid = len([v for v in data["f2"] if v is not None])

    details = {
        "frames": len(data["times"]),
        "f1_values": f1_valid,
        "f2_values": f2_valid
    }

    return True, "Valid", details


def validate_pitch_response(data: dict) -> tuple:
    """Validate pitch response data."""
    required_keys = ["times", "frequencies"]

    for key in required_keys:
        if key not in data:
            return False, f"Missing key: {key}", {}

    if not data["times"]:
        return False, "Empty times array", {}

    # Count voiced frames
    voiced = [v for v in data["frequencies"] if v is not None]
    avg_pitch = sum(voiced) / len(voiced) if voiced else 0

    details = {
        "frames": len(data["times"]),
        "voiced_frames": len(voiced),
        "avg_pitch_hz": round(avg_pitch, 1)
    }

    return True, "Valid", details


def run_tests_for_file(filepath: Path, batch_name: str, logger: StressTestLogger,
                       report: StressTestReport, endpoints: List[str]):
    """Run all endpoint tests for a single file."""
    file_size_kb = filepath.stat().st_size / 1024

    for endpoint in endpoints:
        endpoint_name = endpoint.split("/")[-1]
        test_name = f"{filepath.name} -> {endpoint_name}"

        # Determine timeout based on file size (larger files need more time)
        timeout = max(30, int(file_size_kb / 100))  # ~100KB/s minimum

        status, data, duration_ms = upload_file_to_api(endpoint, filepath, timeout)

        if status == 0:
            if "timed out" in str(data.get("error", "")):
                logger.timeout(f"{test_name} ({duration_ms:.0f}ms)")
                report.add_result(TestResult(
                    file_name=filepath.name,
                    batch=batch_name,
                    endpoint=endpoint_name,
                    status="TIMEOUT",
                    duration_ms=duration_ms,
                    file_size_kb=file_size_kb,
                    message=str(data.get("error", ""))
                ))
            else:
                logger.error(f"{test_name}: {data.get('error', 'Unknown error')}")
                report.add_result(TestResult(
                    file_name=filepath.name,
                    batch=batch_name,
                    endpoint=endpoint_name,
                    status="ERROR",
                    duration_ms=duration_ms,
                    file_size_kb=file_size_kb,
                    message=str(data.get("error", ""))
                ))
            continue

        if status != 200:
            logger.fail(f"{test_name}: HTTP {status}")
            report.add_result(TestResult(
                file_name=filepath.name,
                batch=batch_name,
                endpoint=endpoint_name,
                status="FAIL",
                duration_ms=duration_ms,
                file_size_kb=file_size_kb,
                message=f"HTTP {status}: {data.get('detail', data.get('error', ''))}"
            ))
            continue

        # Validate response based on endpoint
        if endpoint_name == "spectrogram":
            is_valid, message, details = validate_spectrogram_response(data, file_size_kb)
        elif endpoint_name == "formants":
            is_valid, message, details = validate_formants_response(data)
        elif endpoint_name == "pitch":
            is_valid, message, details = validate_pitch_response(data)
        else:
            is_valid, message, details = True, "No validation", {}

        if is_valid:
            logger.success(f"{test_name} ({duration_ms:.0f}ms) - {details}")
            report.add_result(TestResult(
                file_name=filepath.name,
                batch=batch_name,
                endpoint=endpoint_name,
                status="PASS",
                duration_ms=duration_ms,
                file_size_kb=file_size_kb,
                details=details
            ))
        else:
            logger.fail(f"{test_name}: {message}")
            report.add_result(TestResult(
                file_name=filepath.name,
                batch=batch_name,
                endpoint=endpoint_name,
                status="FAIL",
                duration_ms=duration_ms,
                file_size_kb=file_size_kb,
                message=message
            ))


def check_backend_health(logger: StressTestLogger) -> bool:
    """Check if backend is running."""
    try:
        req = urllib.request.Request(f"{BACKEND_URL}/health")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                logger.info("Backend is healthy")
                return True
    except Exception as e:
        logger.error(f"Backend not available: {e}")
    return False


def main():
    """Run stress tests on all batches."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = LOGS_DIR / f"stress_test_{timestamp}.log"
    report_file = f"stress_test_report_{timestamp}.json"

    logger = StressTestLogger(log_file)
    report = StressTestReport(timestamp=timestamp)

    # Check backend
    if not check_backend_health(logger):
        logger.error(f"Start backend with: cd backend && source venv/bin/activate && uvicorn app.main:app --reload")
        return 1

    # Load manifest
    manifest_path = BATCH_DIR / "manifest.json"
    if not manifest_path.exists():
        logger.error("Manifest not found. Run comprehensive_test_generator.py first.")
        return 1

    with open(manifest_path) as f:
        manifest = json.load(f)

    logger.info(f"Loaded manifest: {manifest['total_files']} files, {manifest['total_size_mb']:.2f} MB")

    # Endpoints to test
    endpoints = [
        "/api/v1/analyze/spectrogram",
        "/api/v1/analyze/formants",
        "/api/v1/analyze/pitch"
    ]

    overall_start = time.time()

    # Process each batch
    for batch_name, batch_info in manifest["batches"].items():
        logger.section(f"BATCH: {batch_name} ({batch_info['file_count']} files)")

        for file_info in batch_info["files"]:
            filepath = TEST_DIR / file_info["path"]

            if not filepath.exists():
                logger.error(f"File not found: {filepath}")
                continue

            run_tests_for_file(filepath, batch_name, logger, report, endpoints)

    # Calculate totals
    report.total_duration_ms = (time.time() - overall_start) * 1000

    # Print summary
    logger.section("STRESS TEST SUMMARY")
    logger.info(f"Total tests: {report.total_tests}")
    logger.info(f"Passed: {report.passed}")
    logger.info(f"Failed: {report.failed}")
    logger.info(f"Errors: {report.errors}")
    logger.info(f"Timeouts: {report.timeouts}")
    logger.info(f"Total duration: {report.total_duration_ms / 1000:.1f}s")
    logger.info(f"Data processed: {report.total_data_processed_mb:.2f} MB")
    logger.info(f"Throughput: {report.total_data_processed_mb / (report.total_duration_ms / 1000):.2f} MB/s")

    logger.section("RESULTS BY BATCH")
    for batch, stats in report.summary_by_batch.items():
        pass_rate = (stats["passed"] / stats["total"] * 100) if stats["total"] > 0 else 0
        logger.info(f"{batch}: {stats['passed']}/{stats['total']} ({pass_rate:.0f}%)")

    logger.section("RESULTS BY ENDPOINT")
    for endpoint, stats in report.summary_by_endpoint.items():
        logger.info(f"{endpoint}: {stats['passed']}/{stats['total']} passed, avg {stats['avg_ms']:.0f}ms")

    # Save report
    saved_path = report.save(report_file)
    logger.info(f"\nReport saved to: {saved_path}")
    logger.info(f"Log saved to: {log_file}")

    # Return exit code
    if report.failed == 0 and report.errors == 0 and report.timeouts == 0:
        logger.success("\n🎉 ALL STRESS TESTS PASSED!")
        return 0
    else:
        logger.fail(f"\n⚠️ {report.failed + report.errors + report.timeouts} tests did not pass")
        return 1


if __name__ == "__main__":
    sys.exit(main())
