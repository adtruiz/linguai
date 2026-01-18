"""Audio analysis endpoints powered by Parselmouth"""

import math
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()

# 100MB file size limit (covers ~20 min at 44.1kHz/16-bit/mono)
MAX_FILE_SIZE = 100 * 1024 * 1024

# Supported audio formats (via pydub conversion)
SUPPORTED_FORMATS = {'.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.aiff', '.aif'}


class SupportedFormatsResponse(BaseModel):
    """Supported audio format information"""
    formats: list[str]
    ffmpeg_available: bool
    note: str


@router.get("/formats", response_model=SupportedFormatsResponse)
async def get_supported_formats():
    """
    Get list of supported audio formats and system capabilities.
    Non-WAV formats require ffmpeg to be installed.
    """
    import shutil

    ffmpeg_available = shutil.which("ffmpeg") is not None

    if ffmpeg_available:
        formats = sorted(SUPPORTED_FORMATS)
        note = "All formats supported. ffmpeg is available."
    else:
        formats = [".wav"]
        note = "Only WAV is supported. Install ffmpeg for MP3/FLAC/OGG/M4A support."

    return SupportedFormatsResponse(
        formats=formats,
        ffmpeg_available=ffmpeg_available,
        note=note,
    )


class SpectrogramResponse(BaseModel):
    """Spectrogram data response"""
    times: list[float]
    frequencies: list[float]
    intensities: list[list[float]]  # 2D array [time][frequency]
    duration: float
    sample_rate: int


class FormantResponse(BaseModel):
    """Formant tracking response"""
    times: list[float]
    f1: list[float | None]
    f2: list[float | None]
    f3: list[float | None]
    f4: list[float | None]


class PitchResponse(BaseModel):
    """Pitch tracking response"""
    times: list[float]
    frequencies: list[float | None]
    unit: str = "Hz"


def _convert_to_wav_ffmpeg(src_path: str, dst_path: str) -> None:
    """Convert audio file to WAV using ffmpeg subprocess."""
    import subprocess
    import shutil

    # Find ffmpeg
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        raise HTTPException(
            status_code=500,
            detail="ffmpeg not found. Please install ffmpeg to support MP3/FLAC/OGG conversion."
        )

    try:
        result = subprocess.run(
            [
                ffmpeg_path,
                "-y",  # Overwrite output
                "-i", src_path,  # Input file
                "-acodec", "pcm_s16le",  # 16-bit PCM
                "-ar", "44100",  # 44.1 kHz sample rate
                "-ac", "1",  # Mono (or use 2 for stereo if needed)
                dst_path,
            ],
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout
        )

        if result.returncode != 0:
            raise Exception(result.stderr or "ffmpeg conversion failed")

    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=408,
            detail="Audio conversion timed out. File may be too large or corrupted."
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="ffmpeg not found. Please install ffmpeg to support MP3/FLAC/OGG conversion."
        )


async def _save_upload_to_temp(file: UploadFile) -> str:
    """
    Save uploaded file to temp location with size validation.
    Converts non-WAV formats to WAV using ffmpeg.
    Supports: WAV, MP3, FLAC, OGG, M4A, AAC, WMA, AIFF
    """
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Determine file extension
    filename = file.filename or "audio.wav"
    ext = Path(filename).suffix.lower()

    # Validate format
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {ext}. Supported formats: {', '.join(sorted(SUPPORTED_FORMATS))}"
        )

    # If already WAV, save directly
    if ext == '.wav':
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(content)
            return tmp.name

    # Otherwise, convert to WAV using ffmpeg
    # Save original file to temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as src_tmp:
        src_tmp.write(content)
        src_path = src_tmp.name

    try:
        # Create output WAV file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as wav_tmp:
            wav_path = wav_tmp.name

        _convert_to_wav_ffmpeg(src_path, wav_path)
        return wav_path

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to convert {ext} to WAV: {str(e)}"
        )
    finally:
        # Clean up original temp file
        try:
            os.unlink(src_path)
        except OSError:
            pass


def _get_parselmouth():
    """Import and return parselmouth, raising HTTPException if unavailable."""
    try:
        import parselmouth
        return parselmouth
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Parselmouth not installed"
        )


@router.post("/analyze/spectrogram", response_model=SpectrogramResponse)
async def analyze_spectrogram(
    file: UploadFile = File(...),
    time_step: float = 0.005,
    max_frequency: float = 5000.0,
):
    """
    Generate spectrogram data from an audio file.
    Returns time-frequency intensity matrix.
    """
    parselmouth = _get_parselmouth()
    import numpy as np

    tmp_path = await _save_upload_to_temp(file)

    try:
        sound = parselmouth.Sound(tmp_path)
        spectrogram = sound.to_spectrogram(
            time_step=time_step,
            maximum_frequency=max_frequency,
        )

        times = list(spectrogram.xs())
        frequencies = list(spectrogram.ys())

        # Extract power values into numpy array
        n_frames = spectrogram.n_frames
        n_freqs = len(frequencies)
        intensities_array = np.zeros((n_frames, n_freqs))
        for t_idx in range(n_frames):
            for f_idx in range(n_freqs):
                intensities_array[t_idx, f_idx] = spectrogram.get_power_at(t_idx + 1, f_idx + 1)

        # Convert to dB
        intensities_array = np.where(
            intensities_array > 0,
            10 * np.log10(intensities_array + 1e-30),
            -100
        )
        intensities = intensities_array.tolist()

        return SpectrogramResponse(
            times=times,
            frequencies=frequencies,
            intensities=intensities,
            duration=sound.duration,
            sample_rate=int(sound.sampling_frequency),
        )

    finally:
        os.unlink(tmp_path)


@router.post("/analyze/formants", response_model=FormantResponse)
async def analyze_formants(
    file: UploadFile = File(...),
    max_formant: float = 5500.0,
    time_step: float = 0.01,
):
    """
    Extract formant frequencies (F1-F4) from audio.
    Useful for vowel analysis.
    """
    parselmouth = _get_parselmouth()

    tmp_path = await _save_upload_to_temp(file)

    try:
        sound = parselmouth.Sound(tmp_path)
        formants = sound.to_formant_burg(
            time_step=time_step,
            max_number_of_formants=5,
            maximum_formant=max_formant,
        )

        times = []
        f1, f2, f3, f4 = [], [], [], []

        for i in range(formants.n_frames):
            t = formants.get_time_from_frame_number(i + 1)
            times.append(t)

            for formant_num, formant_list in [(1, f1), (2, f2), (3, f3), (4, f4)]:
                try:
                    val = formants.get_value_at_time(formant_num, t)
                    formant_list.append(val if not math.isnan(val) else None)
                except Exception:
                    formant_list.append(None)

        return FormantResponse(times=times, f1=f1, f2=f2, f3=f3, f4=f4)

    finally:
        os.unlink(tmp_path)


@router.post("/analyze/pitch", response_model=PitchResponse)
async def analyze_pitch(
    file: UploadFile = File(...),
    time_step: float = 0.01,
    pitch_floor: float = 75.0,
    pitch_ceiling: float = 600.0,
):
    """
    Extract pitch (F0) contour from audio.
    """
    parselmouth = _get_parselmouth()

    tmp_path = await _save_upload_to_temp(file)

    try:
        sound = parselmouth.Sound(tmp_path)
        pitch = sound.to_pitch(
            time_step=time_step,
            pitch_floor=pitch_floor,
            pitch_ceiling=pitch_ceiling,
        )

        times = []
        frequencies = []

        for i in range(pitch.n_frames):
            t = pitch.get_time_from_frame_number(i + 1)
            times.append(t)

            f0 = pitch.get_value_at_time(t)
            frequencies.append(f0 if not math.isnan(f0) else None)

        return PitchResponse(times=times, frequencies=frequencies)

    finally:
        os.unlink(tmp_path)


class WaveformResponse(BaseModel):
    """Waveform amplitude data response"""
    times: list[float]
    amplitudes: list[float]
    duration: float
    sample_rate: int
    min_amplitude: float
    max_amplitude: float


class IntensityResponse(BaseModel):
    """Intensity contour response"""
    times: list[float]
    values: list[float]  # in dB
    unit: str = "dB"


class VoiceQualityResponse(BaseModel):
    """Voice quality measures (jitter, shimmer, HNR)"""
    # Jitter measures (pitch perturbation)
    jitter_local: float | None  # Local jitter (%)
    jitter_local_absolute: float | None  # Local absolute jitter (seconds)
    jitter_rap: float | None  # Relative Average Perturbation
    jitter_ppq5: float | None  # 5-point Period Perturbation Quotient

    # Shimmer measures (amplitude perturbation)
    shimmer_local: float | None  # Local shimmer (%)
    shimmer_local_db: float | None  # Local shimmer (dB)
    shimmer_apq3: float | None  # 3-point Amplitude Perturbation Quotient
    shimmer_apq5: float | None  # 5-point Amplitude Perturbation Quotient
    shimmer_apq11: float | None  # 11-point Amplitude Perturbation Quotient

    # Harmonicity
    hnr: float | None  # Harmonics-to-Noise Ratio (dB)
    nhr: float | None  # Noise-to-Harmonics Ratio

    # Additional measures
    mean_pitch: float | None
    pitch_stdev: float | None
    voiced_fraction: float | None  # Fraction of voiced frames
    num_voice_breaks: int | None
    degree_of_voice_breaks: float | None


@router.post("/analyze/waveform", response_model=WaveformResponse)
async def analyze_waveform(
    file: UploadFile = File(...),
    time_step: float = 0.001,
    max_points: int = 10000,
):
    """
    Extract waveform amplitude data for visualization.
    Downsamples if necessary to keep response size manageable.
    """
    parselmouth = _get_parselmouth()
    import numpy as np

    tmp_path = await _save_upload_to_temp(file)

    try:
        sound = parselmouth.Sound(tmp_path)

        # Get raw samples
        samples = sound.values[0]  # First channel
        sample_rate = int(sound.sampling_frequency)
        duration = sound.duration

        # Downsample if too many points
        total_samples = len(samples)
        if total_samples > max_points:
            # Use peak envelope for better visualization
            chunk_size = total_samples // max_points
            downsampled = []
            times = []

            for i in range(0, total_samples - chunk_size, chunk_size):
                chunk = samples[i:i + chunk_size]
                # Take max absolute value to preserve peaks
                max_val = np.max(np.abs(chunk))
                # Preserve sign of the sample with max absolute value
                idx = np.argmax(np.abs(chunk))
                downsampled.append(float(chunk[idx]))
                times.append(i / sample_rate)

            amplitudes = downsampled
        else:
            amplitudes = [float(s) for s in samples]
            times = [i / sample_rate for i in range(len(samples))]

        return WaveformResponse(
            times=times,
            amplitudes=amplitudes,
            duration=duration,
            sample_rate=sample_rate,
            min_amplitude=float(np.min(samples)),
            max_amplitude=float(np.max(samples)),
        )

    finally:
        os.unlink(tmp_path)


@router.post("/analyze/intensity", response_model=IntensityResponse)
async def analyze_intensity(
    file: UploadFile = File(...),
    time_step: float = 0.01,
    minimum_pitch: float = 75.0,
):
    """
    Extract intensity (loudness) contour from audio.
    Returns values in dB.
    """
    parselmouth = _get_parselmouth()

    tmp_path = await _save_upload_to_temp(file)

    try:
        sound = parselmouth.Sound(tmp_path)
        intensity = sound.to_intensity(
            time_step=time_step,
            minimum_pitch=minimum_pitch,
        )

        times = []
        values = []

        for i in range(intensity.n_frames):
            t = intensity.get_time_from_frame_number(i + 1)
            times.append(t)

            val = intensity.get_value(t)
            values.append(val if not math.isnan(val) else 0.0)

        return IntensityResponse(times=times, values=values)

    finally:
        os.unlink(tmp_path)


@router.post("/analyze/voice-quality", response_model=VoiceQualityResponse)
async def analyze_voice_quality(
    file: UploadFile = File(...),
    pitch_floor: float = 75.0,
    pitch_ceiling: float = 600.0,
    max_period_factor: float = 1.3,
    max_amplitude_factor: float = 1.6,
):
    """
    Extract voice quality measures including jitter, shimmer, and HNR.
    Critical for clinical voice assessment (SLP use case).
    """
    parselmouth = _get_parselmouth()

    tmp_path = await _save_upload_to_temp(file)

    try:
        sound = parselmouth.Sound(tmp_path)

        # Create pitch object for voiced frame detection
        pitch = sound.to_pitch(
            pitch_floor=pitch_floor,
            pitch_ceiling=pitch_ceiling,
        )

        # Create PointProcess (glottal pulses)
        point_process = parselmouth.praat.call(
            [sound, pitch],
            "To PointProcess (cc)"
        )

        # Helper function to safely call Praat commands
        def safe_call(obj, command, *args):
            try:
                result = parselmouth.praat.call(obj, command, *args)
                if math.isnan(result) if isinstance(result, float) else False:
                    return None
                return result
            except Exception:
                return None

        # === JITTER MEASURES ===
        jitter_local = safe_call(
            point_process, "Get jitter (local)",
            0, 0,  # time range (0 = all)
            0.0001, 0.02,  # period floor/ceiling
            max_period_factor
        )

        jitter_local_absolute = safe_call(
            point_process, "Get jitter (local, absolute)",
            0, 0, 0.0001, 0.02, max_period_factor
        )

        jitter_rap = safe_call(
            point_process, "Get jitter (rap)",
            0, 0, 0.0001, 0.02, max_period_factor
        )

        jitter_ppq5 = safe_call(
            point_process, "Get jitter (ppq5)",
            0, 0, 0.0001, 0.02, max_period_factor
        )

        # === SHIMMER MEASURES ===
        shimmer_local = safe_call(
            [sound, point_process], "Get shimmer (local)",
            0, 0, 0.0001, 0.02, max_period_factor, max_amplitude_factor
        )

        shimmer_local_db = safe_call(
            [sound, point_process], "Get shimmer (local, dB)",
            0, 0, 0.0001, 0.02, max_period_factor, max_amplitude_factor
        )

        shimmer_apq3 = safe_call(
            [sound, point_process], "Get shimmer (apq3)",
            0, 0, 0.0001, 0.02, max_period_factor, max_amplitude_factor
        )

        shimmer_apq5 = safe_call(
            [sound, point_process], "Get shimmer (apq5)",
            0, 0, 0.0001, 0.02, max_period_factor, max_amplitude_factor
        )

        shimmer_apq11 = safe_call(
            [sound, point_process], "Get shimmer (apq11)",
            0, 0, 0.0001, 0.02, max_period_factor, max_amplitude_factor
        )

        # === HARMONICITY (HNR) ===
        harmonicity = sound.to_harmonicity(
            time_step=0.01,
            minimum_pitch=pitch_floor,
        )

        hnr = safe_call(harmonicity, "Get mean", 0, 0)
        nhr = 1 / (10 ** (hnr / 10)) if hnr and hnr > 0 else None

        # === PITCH STATISTICS ===
        mean_pitch = safe_call(pitch, "Get mean", 0, 0, "Hertz")
        pitch_stdev = safe_call(pitch, "Get standard deviation", 0, 0, "Hertz")

        # Voiced fraction
        voiced_frames = 0
        total_frames = pitch.n_frames
        for i in range(total_frames):
            t = pitch.get_time_from_frame_number(i + 1)
            if not math.isnan(pitch.get_value_at_time(t)):
                voiced_frames += 1

        voiced_fraction = voiced_frames / total_frames if total_frames > 0 else 0

        # Voice breaks
        num_voice_breaks = safe_call(
            pitch, "Count voice breaks", 0, 0
        )
        degree_of_voice_breaks = safe_call(
            pitch, "Get fraction of locally unvoiced frames", 0, 0
        )

        # Convert jitter to percentage
        if jitter_local is not None:
            jitter_local = jitter_local * 100
        if jitter_rap is not None:
            jitter_rap = jitter_rap * 100
        if jitter_ppq5 is not None:
            jitter_ppq5 = jitter_ppq5 * 100

        # Convert shimmer to percentage
        if shimmer_local is not None:
            shimmer_local = shimmer_local * 100
        if shimmer_apq3 is not None:
            shimmer_apq3 = shimmer_apq3 * 100
        if shimmer_apq5 is not None:
            shimmer_apq5 = shimmer_apq5 * 100
        if shimmer_apq11 is not None:
            shimmer_apq11 = shimmer_apq11 * 100

        return VoiceQualityResponse(
            jitter_local=jitter_local,
            jitter_local_absolute=jitter_local_absolute,
            jitter_rap=jitter_rap,
            jitter_ppq5=jitter_ppq5,
            shimmer_local=shimmer_local,
            shimmer_local_db=shimmer_local_db,
            shimmer_apq3=shimmer_apq3,
            shimmer_apq5=shimmer_apq5,
            shimmer_apq11=shimmer_apq11,
            hnr=hnr,
            nhr=nhr,
            mean_pitch=mean_pitch,
            pitch_stdev=pitch_stdev,
            voiced_fraction=voiced_fraction,
            num_voice_breaks=int(num_voice_breaks) if num_voice_breaks else None,
            degree_of_voice_breaks=degree_of_voice_breaks,
        )

    finally:
        os.unlink(tmp_path)
