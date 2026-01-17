"""
Acoustic analysis functions powered by Parselmouth.

This module wraps Praat's acoustic analysis capabilities
with a modern, Pythonic interface.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Union
import numpy as np

try:
    import parselmouth
    from parselmouth.praat import call
    HAS_PARSELMOUTH = True
except ImportError:
    HAS_PARSELMOUTH = False
    parselmouth = None


@dataclass
class SpectrogramData:
    """Container for spectrogram analysis results."""
    times: np.ndarray
    frequencies: np.ndarray
    intensities: np.ndarray  # 2D array [time, frequency]
    duration: float
    sample_rate: int


@dataclass
class FormantData:
    """Container for formant analysis results."""
    times: np.ndarray
    f1: np.ndarray
    f2: np.ndarray
    f3: np.ndarray
    f4: np.ndarray


@dataclass
class PitchData:
    """Container for pitch analysis results."""
    times: np.ndarray
    frequencies: np.ndarray  # NaN for unvoiced segments
    unit: str = "Hz"


def _check_parselmouth():
    """Raise error if Parselmouth is not installed."""
    if not HAS_PARSELMOUTH:
        raise ImportError(
            "Parselmouth is required for acoustic analysis. "
            "Install it with: pip install parselmouth"
        )


def load_sound(path: Union[str, Path]) -> "parselmouth.Sound":
    """
    Load an audio file as a Parselmouth Sound object.

    Args:
        path: Path to audio file (WAV, MP3, FLAC, etc.)

    Returns:
        Parselmouth Sound object

    Raises:
        ImportError: If Parselmouth is not installed
        FileNotFoundError: If file doesn't exist
    """
    _check_parselmouth()
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")
    return parselmouth.Sound(str(path))


def get_spectrogram(
    sound: "parselmouth.Sound",
    time_step: float = 0.005,
    max_frequency: float = 5000.0,
    window_length: float = 0.025,
) -> SpectrogramData:
    """
    Generate spectrogram from a sound.

    Args:
        sound: Parselmouth Sound object
        time_step: Time step between frames (seconds)
        max_frequency: Maximum frequency to analyze (Hz)
        window_length: Analysis window length (seconds)

    Returns:
        SpectrogramData with time, frequency, and intensity arrays
    """
    _check_parselmouth()

    spectrogram = sound.to_spectrogram(
        time_step=time_step,
        maximum_frequency=max_frequency,
        window_length=window_length,
    )

    times = np.array(spectrogram.xs())
    frequencies = np.array(spectrogram.ys())

    # Extract intensity matrix
    intensities = np.zeros((len(times), len(frequencies)))
    for t_idx in range(spectrogram.n_frames):
        for f_idx in range(spectrogram.n_bins):
            value = spectrogram.get_power_at(t_idx + 1, f_idx + 1)
            # Convert to dB
            intensities[t_idx, f_idx] = 10 * np.log10(value + 1e-30)

    return SpectrogramData(
        times=times,
        frequencies=frequencies,
        intensities=intensities,
        duration=sound.duration,
        sample_rate=int(sound.sampling_frequency),
    )


def get_formants(
    sound: "parselmouth.Sound",
    time_step: float = 0.01,
    max_formant: float = 5500.0,
    num_formants: int = 5,
) -> FormantData:
    """
    Extract formant frequencies (F1-F4) from a sound.

    Args:
        sound: Parselmouth Sound object
        time_step: Time step between measurements (seconds)
        max_formant: Maximum formant frequency (Hz)
        num_formants: Number of formants to track

    Returns:
        FormantData with time and formant frequency arrays
    """
    _check_parselmouth()

    formants = sound.to_formant_burg(
        time_step=time_step,
        max_number_of_formants=num_formants,
        maximum_formant=max_formant,
    )

    n_frames = formants.n_frames
    times = np.array([formants.get_time_from_frame_number(i + 1) for i in range(n_frames)])

    def get_formant_track(formant_num: int) -> np.ndarray:
        track = np.zeros(n_frames)
        for i in range(n_frames):
            try:
                val = formants.get_value_at_time(formant_num, times[i])
                track[i] = val if not np.isnan(val) else np.nan
            except:
                track[i] = np.nan
        return track

    return FormantData(
        times=times,
        f1=get_formant_track(1),
        f2=get_formant_track(2),
        f3=get_formant_track(3),
        f4=get_formant_track(4),
    )


def get_pitch(
    sound: "parselmouth.Sound",
    time_step: float = 0.01,
    pitch_floor: float = 75.0,
    pitch_ceiling: float = 600.0,
) -> PitchData:
    """
    Extract pitch (F0) contour from a sound.

    Args:
        sound: Parselmouth Sound object
        time_step: Time step between measurements (seconds)
        pitch_floor: Minimum pitch to detect (Hz)
        pitch_ceiling: Maximum pitch to detect (Hz)

    Returns:
        PitchData with time and frequency arrays
    """
    _check_parselmouth()

    pitch = sound.to_pitch(
        time_step=time_step,
        pitch_floor=pitch_floor,
        pitch_ceiling=pitch_ceiling,
    )

    n_frames = pitch.n_frames
    times = np.array([pitch.get_time_from_frame_number(i + 1) for i in range(n_frames)])

    frequencies = np.zeros(n_frames)
    for i in range(n_frames):
        f0 = pitch.get_value_at_time(times[i])
        frequencies[i] = f0 if not np.isnan(f0) else np.nan

    return PitchData(times=times, frequencies=frequencies)
