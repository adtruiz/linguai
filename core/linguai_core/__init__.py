"""
LinguAI Core - Open-source acoustic analysis library

This module provides Python bindings for acoustic analysis,
built on top of Parselmouth (Praat).

License: GPL-3.0
"""

__version__ = "0.1.0"

from .acoustic import (
    load_sound,
    get_spectrogram,
    get_formants,
    get_pitch,
)
from .annotation import Annotation, Tier, TextGrid

__all__ = [
    "load_sound",
    "get_spectrogram",
    "get_formants",
    "get_pitch",
    "Annotation",
    "Tier",
    "TextGrid",
]
