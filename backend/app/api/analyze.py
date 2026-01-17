"""Audio analysis endpoints powered by Parselmouth"""

import math
import os
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()

# 50MB file size limit
MAX_FILE_SIZE = 50 * 1024 * 1024


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


async def _save_upload_to_temp(file: UploadFile) -> str:
    """Save uploaded file to temp location with size validation."""
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(content)
        return tmp.name


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
