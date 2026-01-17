"""Audio analysis endpoints powered by Parselmouth"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import tempfile
import os

router = APIRouter()


class SpectrogramRequest(BaseModel):
    """Request parameters for spectrogram generation"""
    time_step: float = 0.005  # seconds
    frequency_step: float = 20.0  # Hz
    max_frequency: float = 5000.0  # Hz
    window_length: float = 0.025  # seconds


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
    try:
        import parselmouth
        from parselmouth.praat import call
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Parselmouth not installed. Run: pip install parselmouth"
        )

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Load sound with Parselmouth
        sound = parselmouth.Sound(tmp_path)

        # Create spectrogram
        spectrogram = sound.to_spectrogram(
            time_step=time_step,
            maximum_frequency=max_frequency,
        )

        # Extract data
        times = list(spectrogram.xs())
        frequencies = list(spectrogram.ys())

        # Get intensity values (convert to list of lists)
        intensities = []
        for t_idx in range(spectrogram.n_frames):
            frame = []
            for f_idx in range(spectrogram.n_bins):
                # Get power spectral density and convert to dB
                value = spectrogram.get_power_at(t_idx + 1, f_idx + 1)
                frame.append(10 * (value + 1e-30).__log10__() if value > 0 else -100)
            intensities.append(frame)

        return SpectrogramResponse(
            times=times,
            frequencies=frequencies,
            intensities=intensities,
            duration=sound.duration,
            sample_rate=int(sound.sampling_frequency),
        )

    finally:
        # Clean up temp file
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
    try:
        import parselmouth
    except ImportError:
        raise HTTPException(status_code=500, detail="Parselmouth not installed")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

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
                    formant_list.append(val if val == val else None)  # NaN check
                except:
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
    try:
        import parselmouth
    except ImportError:
        raise HTTPException(status_code=500, detail="Parselmouth not installed")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

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
            frequencies.append(f0 if f0 == f0 else None)  # NaN check

        return PitchResponse(times=times, frequencies=frequencies)

    finally:
        os.unlink(tmp_path)
