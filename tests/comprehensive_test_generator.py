"""
LinguAI Comprehensive Test Generator
Generates 5 batches of test files to stress test all acoustic analysis features.

Batch 1: Extended Duration (30s, 1min, 5min, 10min)
Batch 2: Format Variety (sample rates, bit depths, channels)
Batch 3: Real Phonetic Patterns (vowels, consonants, tones)
Batch 4: Edge Cases (noise, clipping, silence gaps)
Batch 5: Clinical/Research Scenarios (dysphonia, child speech patterns)
"""

import os
import sys
import wave
import struct
import math
import random
import json
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from typing import List, Tuple, Optional

# Configuration
TEST_DIR = Path(__file__).parent
DATA_DIR = TEST_DIR / "data"
BATCH_DIR = DATA_DIR / "stress_test_batches"

# Ensure directories exist
BATCH_DIR.mkdir(parents=True, exist_ok=True)
for i in range(1, 6):
    (BATCH_DIR / f"batch_{i}").mkdir(exist_ok=True)


# =============================================================================
# CORE AUDIO GENERATION UTILITIES
# =============================================================================

def write_wav(filepath: Path, samples: List[int], sample_rate: int = 44100,
              num_channels: int = 1, sample_width: int = 2) -> Path:
    """Write samples to a WAV file."""
    with wave.open(str(filepath), 'w') as wav_file:
        wav_file.setnchannels(num_channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)

        if sample_width == 2:
            fmt = '<h'
            max_val = 32767
        elif sample_width == 1:
            fmt = '<B'
            max_val = 255
        else:  # 3 bytes (24-bit)
            fmt = None
            max_val = 8388607

        for sample in samples:
            sample = max(-max_val, min(max_val, int(sample)))
            if fmt:
                wav_file.writeframes(struct.pack(fmt, sample))
            else:
                # 24-bit handling
                b = sample.to_bytes(3, byteorder='little', signed=True)
                wav_file.writeframes(b)

    return filepath


def generate_sine(frequency: float, duration: float, sample_rate: int = 44100,
                  amplitude: float = 0.5) -> List[int]:
    """Generate sine wave samples."""
    n_samples = int(duration * sample_rate)
    samples = []
    for i in range(n_samples):
        t = i / sample_rate
        value = int(32767 * amplitude * math.sin(2 * math.pi * frequency * t))
        samples.append(value)
    return samples


def generate_noise(duration: float, sample_rate: int = 44100,
                   amplitude: float = 0.3) -> List[int]:
    """Generate white noise samples."""
    n_samples = int(duration * sample_rate)
    return [int(32767 * amplitude * (random.random() * 2 - 1)) for _ in range(n_samples)]


def generate_silence(duration: float, sample_rate: int = 44100) -> List[int]:
    """Generate silence."""
    return [0] * int(duration * sample_rate)


def mix_samples(*sample_lists: List[int]) -> List[int]:
    """Mix multiple sample lists together."""
    max_len = max(len(s) for s in sample_lists)
    result = [0] * max_len
    for samples in sample_lists:
        for i, s in enumerate(samples):
            if i < max_len:
                result[i] += s
    # Normalize to prevent clipping
    max_val = max(abs(s) for s in result) if result else 1
    if max_val > 32767:
        result = [int(s * 32767 / max_val) for s in result]
    return result


def apply_envelope(samples: List[int], attack: float = 0.01, release: float = 0.01,
                   sample_rate: int = 44100) -> List[int]:
    """Apply attack/release envelope to samples."""
    attack_samples = int(attack * sample_rate)
    release_samples = int(release * sample_rate)
    result = samples.copy()

    for i in range(min(attack_samples, len(result))):
        result[i] = int(result[i] * (i / attack_samples))

    for i in range(min(release_samples, len(result))):
        idx = len(result) - 1 - i
        if idx >= 0:
            result[idx] = int(result[idx] * (i / release_samples))

    return result


# =============================================================================
# BATCH 1: EXTENDED DURATION FILES
# =============================================================================

def generate_batch_1():
    """Generate extended duration test files."""
    print("\n=== BATCH 1: Extended Duration Files ===")
    batch_dir = BATCH_DIR / "batch_1"
    files = []

    durations = [
        (30, "30_seconds"),
        (60, "1_minute"),
        (300, "5_minutes"),
        (600, "10_minutes"),
    ]

    for duration_sec, name in durations:
        print(f"  Generating {name} file ({duration_sec}s)...")

        # Complex speech-like pattern with varying F0
        samples = []
        sample_rate = 44100

        for i in range(int(duration_sec * sample_rate)):
            t = i / sample_rate

            # Varying fundamental frequency (simulating natural speech prosody)
            f0 = 120 + 30 * math.sin(2 * math.pi * 0.3 * t)  # Slow variation
            f0 += 10 * math.sin(2 * math.pi * 2 * t)  # Faster variation

            # Generate harmonics
            value = 0
            for harmonic in range(1, 15):
                h_freq = f0 * harmonic
                amp = 1.0 / (harmonic ** 1.2)
                value += amp * math.sin(2 * math.pi * h_freq * t)

            # Add formant-like filtering (simplified)
            formant_boost = 0
            for f in [500, 1500, 2500]:  # F1, F2, F3
                if abs(f0 * round(f / f0) - f) < 100:
                    formant_boost += 0.3

            value *= (1 + formant_boost)
            samples.append(int(32767 * 0.3 * value))

        filepath = batch_dir / f"extended_{name}.wav"
        write_wav(filepath, samples, sample_rate)
        files.append(filepath)
        print(f"    Created: {filepath.name} ({filepath.stat().st_size / 1024 / 1024:.2f} MB)")

    return files


# =============================================================================
# BATCH 2: FORMAT VARIETY
# =============================================================================

def generate_batch_2():
    """Generate files with different formats, sample rates, bit depths."""
    print("\n=== BATCH 2: Format Variety ===")
    batch_dir = BATCH_DIR / "batch_2"
    files = []

    # Base content: 5 second speech-like signal
    base_duration = 5.0

    # Different sample rates
    sample_rates = [8000, 16000, 22050, 44100, 48000, 96000]

    for sr in sample_rates:
        print(f"  Generating {sr}Hz sample rate...")
        samples = []
        f0 = 150  # Female-like pitch

        for i in range(int(base_duration * sr)):
            t = i / sr
            value = 0
            for h in range(1, 10):
                value += (1/h) * math.sin(2 * math.pi * f0 * h * t)
            samples.append(int(32767 * 0.4 * value))

        filepath = batch_dir / f"sample_rate_{sr}hz.wav"
        write_wav(filepath, samples, sr)
        files.append(filepath)

    # Different channel configurations (using 44100 Hz)
    print("  Generating mono file...")
    mono_samples = generate_sine(440, 3.0, 44100, 0.5)
    filepath = batch_dir / "channels_mono.wav"
    write_wav(filepath, mono_samples, 44100, num_channels=1)
    files.append(filepath)

    print("  Generating stereo file...")
    # Stereo: interleave left and right channels
    left = generate_sine(440, 3.0, 44100, 0.5)
    right = generate_sine(550, 3.0, 44100, 0.5)  # Different frequency
    stereo_samples = []
    for l, r in zip(left, right):
        stereo_samples.append(l)
        stereo_samples.append(r)
    filepath = batch_dir / "channels_stereo.wav"
    with wave.open(str(filepath), 'w') as wav_file:
        wav_file.setnchannels(2)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        for s in stereo_samples:
            wav_file.writeframes(struct.pack('<h', s))
    files.append(filepath)

    # 8-bit audio
    print("  Generating 8-bit file...")
    samples_8bit = generate_sine(440, 3.0, 44100, 0.5)
    samples_8bit = [(s // 256) + 128 for s in samples_8bit]  # Convert to unsigned 8-bit
    filepath = batch_dir / "bit_depth_8bit.wav"
    with wave.open(str(filepath), 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(1)
        wav_file.setframerate(44100)
        for s in samples_8bit:
            wav_file.writeframes(struct.pack('<B', max(0, min(255, s))))
    files.append(filepath)

    print(f"  Created {len(files)} format variety files")
    return files


# =============================================================================
# BATCH 3: REAL PHONETIC PATTERNS
# =============================================================================

def generate_vowel(vowel_type: str, duration: float = 0.3,
                   sample_rate: int = 44100) -> List[int]:
    """Generate synthetic vowel with appropriate formants."""
    # Formant frequencies for different vowels (approximate male values)
    vowel_formants = {
        'i': [270, 2290, 3010],   # /i/ as in "beat"
        'ɪ': [390, 1990, 2550],   # /ɪ/ as in "bit"
        'e': [530, 1840, 2480],   # /e/ as in "bait"
        'ɛ': [660, 1720, 2410],   # /ɛ/ as in "bet"
        'æ': [730, 1090, 2440],   # /æ/ as in "bat"
        'ɑ': [730, 1090, 2440],   # /ɑ/ as in "bot"
        'ɔ': [570, 840, 2410],    # /ɔ/ as in "bought"
        'o': [490, 830, 2480],    # /o/ as in "boat"
        'ʊ': [440, 1020, 2240],   # /ʊ/ as in "book"
        'u': [300, 870, 2240],    # /u/ as in "boot"
        'ʌ': [640, 1190, 2390],   # /ʌ/ as in "but"
        'ə': [500, 1500, 2500],   # /ə/ schwa
    }

    formants = vowel_formants.get(vowel_type, [500, 1500, 2500])
    bandwidths = [60, 100, 150]

    samples = []
    f0 = 125  # Fundamental frequency

    for i in range(int(duration * sample_rate)):
        t = i / sample_rate

        # Add slight F0 variation (natural speech)
        current_f0 = f0 + 5 * math.sin(2 * math.pi * 5 * t)

        value = 0
        for harmonic in range(1, 30):
            h_freq = current_f0 * harmonic
            amplitude = 1.0 / harmonic

            # Apply formant filtering
            for f, bw in zip(formants, bandwidths):
                # Resonance boost near formant frequencies
                distance = abs(h_freq - f) / bw
                resonance = 1.0 / (1.0 + distance ** 2)
                amplitude *= (1 + 3 * resonance)

            value += amplitude * math.sin(2 * math.pi * h_freq * t)

        samples.append(int(32767 * 0.15 * value))

    return apply_envelope(samples, 0.02, 0.02, sample_rate)


def generate_fricative(fricative_type: str, duration: float = 0.2,
                       sample_rate: int = 44100) -> List[int]:
    """Generate synthetic fricative consonant."""
    # Frequency ranges for different fricatives
    fricative_params = {
        's': (4000, 8000, 0.4),    # High frequency, strong
        'ʃ': (2500, 6000, 0.35),   # Mid-high, moderate
        'f': (1500, 8000, 0.2),    # Broad, weak
        'θ': (1500, 8000, 0.15),   # Broad, very weak
        'h': (500, 4000, 0.1),     # Low, very weak
        'z': (4000, 8000, 0.3),    # Like /s/ but with voicing
        'ʒ': (2500, 6000, 0.25),   # Like /ʃ/ but with voicing
        'v': (1500, 6000, 0.15),   # Like /f/ but with voicing
    }

    low_freq, high_freq, amplitude = fricative_params.get(fricative_type, (2000, 6000, 0.2))
    voiced = fricative_type in ['z', 'ʒ', 'v']

    samples = []
    for i in range(int(duration * sample_rate)):
        t = i / sample_rate

        # Filtered noise
        noise_val = random.random() * 2 - 1

        # Simple bandpass simulation
        freq = random.uniform(low_freq, high_freq)
        noise_val *= math.sin(2 * math.pi * freq * t)

        if voiced:
            # Add voicing (fundamental + harmonics)
            f0 = 125
            voice = 0.3 * math.sin(2 * math.pi * f0 * t)
            voice += 0.15 * math.sin(2 * math.pi * f0 * 2 * t)
            noise_val = 0.7 * noise_val + 0.3 * voice

        samples.append(int(32767 * amplitude * noise_val))

    return apply_envelope(samples, 0.01, 0.01, sample_rate)


def generate_stop_consonant(stop_type: str, duration: float = 0.15,
                            sample_rate: int = 44100) -> List[int]:
    """Generate synthetic stop consonant (plosive)."""
    # Stop consonant parameters
    stop_params = {
        'p': (False, 2000, 0.02),   # Voiceless bilabial
        'b': (True, 500, 0.02),     # Voiced bilabial
        't': (False, 4000, 0.015),  # Voiceless alveolar
        'd': (True, 2500, 0.015),   # Voiced alveolar
        'k': (False, 2500, 0.025),  # Voiceless velar
        'g': (True, 1500, 0.025),   # Voiced velar
    }

    voiced, burst_freq, vot = stop_params.get(stop_type, (False, 2000, 0.02))

    samples = []

    # Closure (silence or voicing bar)
    closure_duration = duration * 0.5
    for i in range(int(closure_duration * sample_rate)):
        t = i / sample_rate
        if voiced:
            # Low frequency voicing bar
            samples.append(int(32767 * 0.1 * math.sin(2 * math.pi * 125 * t)))
        else:
            samples.append(0)

    # Burst
    burst_duration = 0.01
    for i in range(int(burst_duration * sample_rate)):
        noise = random.random() * 2 - 1
        # Envelope the burst
        env = 1.0 - (i / (burst_duration * sample_rate))
        samples.append(int(32767 * 0.5 * noise * env))

    # VOT (aspiration for voiceless, transition for voiced)
    vot_samples = int(vot * sample_rate)
    for i in range(vot_samples):
        t = i / sample_rate
        if not voiced:
            # Aspiration noise
            noise = random.random() * 2 - 1
            env = 1.0 - (i / vot_samples)
            samples.append(int(32767 * 0.2 * noise * env))
        else:
            # Quick transition to vowel
            f0 = 125
            samples.append(int(32767 * 0.3 * math.sin(2 * math.pi * f0 * t)))

    return samples


def generate_tone_contour(tone_type: str, duration: float = 0.4,
                          sample_rate: int = 44100) -> List[int]:
    """Generate tonal patterns (for tonal languages like Mandarin)."""
    # Mandarin tone contours (pitch patterns)
    tone_contours = {
        'tone1': lambda t, d: 200,                                    # High level
        'tone2': lambda t, d: 150 + 80 * (t / d),                     # Rising
        'tone3': lambda t, d: 180 - 60 * math.sin(math.pi * t / d),   # Dipping
        'tone4': lambda t, d: 220 - 100 * (t / d),                    # Falling
        'tone5': lambda t, d: 140,                                    # Neutral (shorter)
    }

    pitch_func = tone_contours.get(tone_type, tone_contours['tone1'])

    samples = []
    for i in range(int(duration * sample_rate)):
        t = i / sample_rate
        f0 = pitch_func(t, duration)

        value = 0
        for harmonic in range(1, 15):
            h_freq = f0 * harmonic
            amp = 1.0 / (harmonic ** 1.1)
            value += amp * math.sin(2 * math.pi * h_freq * t)

        samples.append(int(32767 * 0.25 * value))

    return apply_envelope(samples, 0.02, 0.03, sample_rate)


def generate_batch_3():
    """Generate real phonetic patterns."""
    print("\n=== BATCH 3: Real Phonetic Patterns ===")
    batch_dir = BATCH_DIR / "batch_3"
    files = []

    # All vowels
    print("  Generating vowel inventory...")
    vowels = ['i', 'ɪ', 'e', 'ɛ', 'æ', 'ɑ', 'ɔ', 'o', 'ʊ', 'u', 'ʌ', 'ə']
    all_vowel_samples = []
    for v in vowels:
        all_vowel_samples.extend(generate_vowel(v, 0.4))
        all_vowel_samples.extend(generate_silence(0.1))

    filepath = batch_dir / "vowel_inventory.wav"
    write_wav(filepath, all_vowel_samples)
    files.append(filepath)

    # Individual vowels for detailed analysis
    for v in ['i', 'æ', 'ɑ', 'u']:  # Corner vowels
        samples = generate_vowel(v, 1.0)  # Longer for analysis
        filepath = batch_dir / f"vowel_{v.replace('ɑ', 'ah').replace('æ', 'ae')}_sustained.wav"
        write_wav(filepath, samples)
        files.append(filepath)

    # Fricatives
    print("  Generating fricative consonants...")
    fricatives = ['s', 'ʃ', 'f', 'θ', 'z', 'ʒ', 'v']
    all_fricative_samples = []
    for f in fricatives:
        all_fricative_samples.extend(generate_fricative(f, 0.3))
        all_fricative_samples.extend(generate_silence(0.1))

    filepath = batch_dir / "fricative_inventory.wav"
    write_wav(filepath, all_fricative_samples)
    files.append(filepath)

    # Stop consonants (plosives)
    print("  Generating stop consonants...")
    stops = ['p', 'b', 't', 'd', 'k', 'g']
    all_stop_samples = []
    for s in stops:
        all_stop_samples.extend(generate_stop_consonant(s, 0.2))
        all_stop_samples.extend(generate_vowel('ɑ', 0.2))  # Add vowel context
        all_stop_samples.extend(generate_silence(0.1))

    filepath = batch_dir / "stop_consonant_inventory.wav"
    write_wav(filepath, all_stop_samples)
    files.append(filepath)

    # Mandarin tones
    print("  Generating Mandarin tone contours...")
    tones = ['tone1', 'tone2', 'tone3', 'tone4']
    all_tone_samples = []
    for tone in tones:
        all_tone_samples.extend(generate_tone_contour(tone, 0.5))
        all_tone_samples.extend(generate_silence(0.2))

    filepath = batch_dir / "mandarin_tones.wav"
    write_wav(filepath, all_tone_samples)
    files.append(filepath)

    # Diphthongs (vowel transitions)
    print("  Generating diphthongs...")
    diphthong_samples = []
    # /aɪ/ as in "buy"
    for i in range(int(0.4 * 44100)):
        t = i / 44100
        progress = t / 0.4
        # Interpolate formants from /ɑ/ to /ɪ/
        f1 = 730 - progress * 340  # 730 -> 390
        f2 = 1090 + progress * 900  # 1090 -> 1990

        f0 = 125
        value = 0
        for h in range(1, 20):
            h_freq = f0 * h
            amp = 1.0 / h
            for f in [f1, f2, 2500]:
                resonance = 1.0 / (1 + ((h_freq - f) / 80) ** 2)
                amp *= (1 + 2 * resonance)
            value += amp * math.sin(2 * math.pi * h_freq * t)
        diphthong_samples.append(int(32767 * 0.15 * value))

    diphthong_samples = apply_envelope(diphthong_samples, 0.02, 0.02)
    filepath = batch_dir / "diphthong_ai.wav"
    write_wav(filepath, diphthong_samples)
    files.append(filepath)

    # Pitch variation patterns (intonation)
    print("  Generating intonation patterns...")
    # Question intonation (rising)
    question_samples = []
    for i in range(int(1.0 * 44100)):
        t = i / 44100
        f0 = 120 + 80 * (t / 1.0)  # Rising from 120 to 200 Hz
        value = sum((1/h) * math.sin(2 * math.pi * f0 * h * t) for h in range(1, 10))
        question_samples.append(int(32767 * 0.3 * value))

    filepath = batch_dir / "intonation_question_rising.wav"
    write_wav(filepath, apply_envelope(question_samples, 0.02, 0.05))
    files.append(filepath)

    # Statement intonation (falling)
    statement_samples = []
    for i in range(int(1.0 * 44100)):
        t = i / 44100
        f0 = 180 - 60 * (t / 1.0)  # Falling from 180 to 120 Hz
        value = sum((1/h) * math.sin(2 * math.pi * f0 * h * t) for h in range(1, 10))
        statement_samples.append(int(32767 * 0.3 * value))

    filepath = batch_dir / "intonation_statement_falling.wav"
    write_wav(filepath, apply_envelope(statement_samples, 0.02, 0.05))
    files.append(filepath)

    print(f"  Created {len(files)} phonetic pattern files")
    return files


# =============================================================================
# BATCH 4: EDGE CASES
# =============================================================================

def generate_batch_4():
    """Generate edge case audio files."""
    print("\n=== BATCH 4: Edge Cases ===")
    batch_dir = BATCH_DIR / "batch_4"
    files = []
    sample_rate = 44100

    # 1. Very quiet audio (low SNR)
    print("  Generating very quiet audio...")
    quiet_samples = generate_sine(440, 3.0, sample_rate, 0.01)  # 1% amplitude
    noise = generate_noise(3.0, sample_rate, 0.005)
    quiet_with_noise = mix_samples(quiet_samples, noise)
    filepath = batch_dir / "very_quiet_signal.wav"
    write_wav(filepath, quiet_with_noise)
    files.append(filepath)

    # 2. Clipped audio (distortion)
    print("  Generating clipped/distorted audio...")
    loud_samples = generate_sine(440, 3.0, sample_rate, 1.5)  # Over 100%
    clipped = [max(-32767, min(32767, int(s * 1.5))) for s in loud_samples]
    filepath = batch_dir / "clipped_distorted.wav"
    write_wav(filepath, clipped)
    files.append(filepath)

    # 3. Audio with silence gaps
    print("  Generating audio with silence gaps...")
    gap_samples = []
    for i in range(5):
        gap_samples.extend(generate_sine(440 + i * 50, 0.5, sample_rate, 0.5))
        gap_samples.extend(generate_silence(0.3, sample_rate))
    filepath = batch_dir / "silence_gaps.wav"
    write_wav(filepath, gap_samples)
    files.append(filepath)

    # 4. Background noise (babble/crowd)
    print("  Generating background noise...")
    babble = []
    for i in range(int(5.0 * sample_rate)):
        t = i / sample_rate
        # Multiple overlapping "voices" at different pitches
        value = 0
        for f0 in [100, 150, 180, 220, 130]:
            f0_var = f0 + random.uniform(-10, 10)
            value += 0.1 * math.sin(2 * math.pi * f0_var * t)
        # Add noise
        value += 0.3 * (random.random() * 2 - 1)
        babble.append(int(32767 * 0.3 * value))

    filepath = batch_dir / "background_babble.wav"
    write_wav(filepath, babble)
    files.append(filepath)

    # 5. Signal + noise (various SNR levels)
    print("  Generating various SNR levels...")
    for snr_db in [30, 20, 10, 5, 0]:
        signal = generate_sine(200, 3.0, sample_rate, 0.5)
        noise_amp = 0.5 / (10 ** (snr_db / 20))
        noise = generate_noise(3.0, sample_rate, noise_amp)
        noisy_signal = mix_samples(signal, noise)
        filepath = batch_dir / f"snr_{snr_db}db.wav"
        write_wav(filepath, noisy_signal)
        files.append(filepath)

    # 6. DC offset
    print("  Generating audio with DC offset...")
    dc_samples = generate_sine(440, 3.0, sample_rate, 0.3)
    dc_offset = [s + 10000 for s in dc_samples]  # Add DC bias
    filepath = batch_dir / "dc_offset.wav"
    write_wav(filepath, dc_offset)
    files.append(filepath)

    # 7. Very short audio (< 100ms)
    print("  Generating very short audio...")
    short_samples = generate_sine(440, 0.05, sample_rate, 0.5)  # 50ms
    filepath = batch_dir / "very_short_50ms.wav"
    write_wav(filepath, apply_envelope(short_samples, 0.005, 0.005))
    files.append(filepath)

    # 8. Frequency sweep (chirp)
    print("  Generating frequency sweep...")
    sweep_samples = []
    for i in range(int(3.0 * sample_rate)):
        t = i / sample_rate
        freq = 100 + (8000 - 100) * (t / 3.0)  # 100Hz to 8kHz
        sweep_samples.append(int(32767 * 0.5 * math.sin(2 * math.pi * freq * t)))
    filepath = batch_dir / "frequency_sweep.wav"
    write_wav(filepath, sweep_samples)
    files.append(filepath)

    # 9. Impulse train (clicks)
    print("  Generating impulse train...")
    impulse_samples = [0] * int(2.0 * sample_rate)
    for i in range(20):
        idx = int(i * 0.1 * sample_rate)
        if idx < len(impulse_samples):
            impulse_samples[idx] = 32767
            if idx + 1 < len(impulse_samples):
                impulse_samples[idx + 1] = -32767
    filepath = batch_dir / "impulse_train.wav"
    write_wav(filepath, impulse_samples)
    files.append(filepath)

    # 10. Amplitude modulated signal
    print("  Generating amplitude modulated signal...")
    am_samples = []
    carrier_freq = 1000
    mod_freq = 5
    for i in range(int(3.0 * sample_rate)):
        t = i / sample_rate
        modulator = 0.5 + 0.5 * math.sin(2 * math.pi * mod_freq * t)
        carrier = math.sin(2 * math.pi * carrier_freq * t)
        am_samples.append(int(32767 * 0.5 * modulator * carrier))
    filepath = batch_dir / "amplitude_modulated.wav"
    write_wav(filepath, am_samples)
    files.append(filepath)

    print(f"  Created {len(files)} edge case files")
    return files


# =============================================================================
# BATCH 5: CLINICAL/RESEARCH SCENARIOS
# =============================================================================

def generate_batch_5():
    """Generate clinical and research scenario audio files."""
    print("\n=== BATCH 5: Clinical/Research Scenarios ===")
    batch_dir = BATCH_DIR / "batch_5"
    files = []
    sample_rate = 44100

    # 1. Breathy voice (common in voice disorders)
    print("  Generating breathy voice...")
    breathy_samples = []
    for i in range(int(3.0 * sample_rate)):
        t = i / sample_rate
        f0 = 180  # Higher pitch
        # Less harmonics, more noise
        voice = 0.3 * math.sin(2 * math.pi * f0 * t)
        voice += 0.1 * math.sin(2 * math.pi * f0 * 2 * t)
        noise = 0.4 * (random.random() * 2 - 1)  # Significant aspiration noise
        breathy_samples.append(int(32767 * 0.4 * (voice + noise)))
    filepath = batch_dir / "breathy_voice.wav"
    write_wav(filepath, breathy_samples)
    files.append(filepath)

    # 2. Creaky voice (vocal fry)
    print("  Generating creaky voice (vocal fry)...")
    creaky_samples = []
    for i in range(int(3.0 * sample_rate)):
        t = i / sample_rate
        f0 = 50 + 20 * random.random()  # Very low, irregular F0
        # Irregular glottal pulses
        phase = (t * f0) % 1
        if phase < 0.1:
            value = 1.0
        elif phase < 0.2:
            value = -0.5
        else:
            value = 0.05 * (random.random() * 2 - 1)
        creaky_samples.append(int(32767 * 0.4 * value))
    filepath = batch_dir / "creaky_voice_vocal_fry.wav"
    write_wav(filepath, creaky_samples)
    files.append(filepath)

    # 3. Jitter simulation (pitch perturbation)
    print("  Generating voice with jitter...")
    jitter_samples = []
    base_f0 = 120
    jitter_percent = 3.0  # 3% jitter
    for i in range(int(3.0 * sample_rate)):
        t = i / sample_rate
        # Add random pitch perturbation
        f0 = base_f0 * (1 + jitter_percent/100 * (random.random() * 2 - 1))
        value = sum((1/h) * math.sin(2 * math.pi * f0 * h * t) for h in range(1, 10))
        jitter_samples.append(int(32767 * 0.4 * value))
    filepath = batch_dir / "voice_with_jitter.wav"
    write_wav(filepath, jitter_samples)
    files.append(filepath)

    # 4. Shimmer simulation (amplitude perturbation)
    print("  Generating voice with shimmer...")
    shimmer_samples = []
    for i in range(int(3.0 * sample_rate)):
        t = i / sample_rate
        f0 = 120
        # Add random amplitude perturbation per cycle
        shimmer = 1 + 0.1 * math.sin(2 * math.pi * f0 * 0.7 * t)  # Slow amplitude variation
        value = shimmer * sum((1/h) * math.sin(2 * math.pi * f0 * h * t) for h in range(1, 10))
        shimmer_samples.append(int(32767 * 0.4 * value))
    filepath = batch_dir / "voice_with_shimmer.wav"
    write_wav(filepath, shimmer_samples)
    files.append(filepath)

    # 5. Child-like speech (higher pitch, different formants)
    print("  Generating child-like speech pattern...")
    child_samples = []
    child_f0 = 300  # Much higher fundamental
    # Scaled formants for smaller vocal tract
    child_formants = [800, 2400, 3600]
    for i in range(int(3.0 * sample_rate)):
        t = i / sample_rate
        f0 = child_f0 + 20 * math.sin(2 * math.pi * 4 * t)  # More pitch variation
        value = 0
        for h in range(1, 20):
            h_freq = f0 * h
            amp = 1.0 / h
            for f in child_formants:
                resonance = 1.0 / (1 + ((h_freq - f) / 100) ** 2)
                amp *= (1 + 2 * resonance)
            value += amp * math.sin(2 * math.pi * h_freq * t)
        child_samples.append(int(32767 * 0.15 * value))
    filepath = batch_dir / "child_speech_pattern.wav"
    write_wav(filepath, child_samples)
    files.append(filepath)

    # 6. Elderly voice simulation (lower HNR, tremor)
    print("  Generating elderly voice pattern...")
    elderly_samples = []
    for i in range(int(3.0 * sample_rate)):
        t = i / sample_rate
        # Tremor (slow pitch oscillation)
        f0 = 150 + 8 * math.sin(2 * math.pi * 5 * t)
        # Reduced harmonic energy, more noise
        value = 0.5 * math.sin(2 * math.pi * f0 * t)
        value += 0.2 * math.sin(2 * math.pi * f0 * 2 * t)
        value += 0.15 * (random.random() * 2 - 1)  # Breathiness
        elderly_samples.append(int(32767 * 0.4 * value))
    filepath = batch_dir / "elderly_voice_tremor.wav"
    write_wav(filepath, elderly_samples)
    files.append(filepath)

    # 7. Sustained vowel /a/ for clinical analysis (3 seconds)
    print("  Generating sustained /a/ for clinical analysis...")
    sustained_a = generate_vowel('ɑ', 3.0)
    filepath = batch_dir / "sustained_a_clinical.wav"
    write_wav(filepath, sustained_a)
    files.append(filepath)

    # 8. Maximum phonation time test pattern
    print("  Generating maximum phonation time pattern...")
    mpt_samples = []
    total_duration = 10.0  # 10 seconds
    for i in range(int(total_duration * sample_rate)):
        t = i / sample_rate
        # Gradual decrease in amplitude and increase in breathiness
        decay = 1.0 - 0.3 * (t / total_duration)
        breathiness = 0.1 + 0.3 * (t / total_duration)

        f0 = 120 - 20 * (t / total_duration)  # Slight pitch drop
        value = decay * sum((1/h) * math.sin(2 * math.pi * f0 * h * t) for h in range(1, 10))
        value += breathiness * (random.random() * 2 - 1)
        mpt_samples.append(int(32767 * 0.4 * value))
    filepath = batch_dir / "maximum_phonation_time.wav"
    write_wav(filepath, mpt_samples)
    files.append(filepath)

    # 9. Diadochokinetic rate pattern (pa-ta-ka)
    print("  Generating diadochokinetic (pa-ta-ka) pattern...")
    ddk_samples = []
    syllables = ['p', 't', 'k']
    for rep in range(10):  # 10 repetitions
        for syl in syllables:
            ddk_samples.extend(generate_stop_consonant(syl, 0.05))
            ddk_samples.extend(generate_vowel('ɑ', 0.1))
    filepath = batch_dir / "diadochokinetic_pataka.wav"
    write_wav(filepath, ddk_samples)
    files.append(filepath)

    # 10. Reading passage simulation (varied prosody)
    print("  Generating reading passage prosody pattern...")
    passage_samples = []
    # Simulate sentence-level prosody
    phrases = [
        (0.8, 'falling'),   # Statement
        (0.6, 'rising'),    # Question
        (1.0, 'falling'),   # Longer statement
        (0.4, 'level'),     # Short phrase
        (1.2, 'falling'),   # Final statement
    ]

    for duration, contour in phrases:
        for i in range(int(duration * sample_rate)):
            t = i / sample_rate
            progress = t / duration

            if contour == 'falling':
                f0 = 180 - 60 * progress
            elif contour == 'rising':
                f0 = 140 + 50 * progress
            else:
                f0 = 150

            value = sum((1/h) * math.sin(2 * math.pi * f0 * h * t) for h in range(1, 10))
            passage_samples.append(int(32767 * 0.35 * value))

        # Pause between phrases
        passage_samples.extend(generate_silence(0.2))

    filepath = batch_dir / "reading_passage_prosody.wav"
    write_wav(filepath, passage_samples)
    files.append(filepath)

    print(f"  Created {len(files)} clinical/research files")
    return files


# =============================================================================
# MAIN
# =============================================================================

def generate_manifest(all_files: dict):
    """Generate a manifest file documenting all test files."""
    manifest = {
        "generated": datetime.now().isoformat(),
        "total_files": sum(len(files) for files in all_files.values()),
        "total_size_mb": 0,
        "batches": {}
    }

    for batch_name, files in all_files.items():
        batch_info = {
            "file_count": len(files),
            "files": []
        }

        for f in files:
            size_kb = f.stat().st_size / 1024
            manifest["total_size_mb"] += size_kb / 1024
            batch_info["files"].append({
                "name": f.name,
                "path": str(f.relative_to(TEST_DIR)),
                "size_kb": round(size_kb, 2)
            })

        manifest["batches"][batch_name] = batch_info

    manifest["total_size_mb"] = round(manifest["total_size_mb"], 2)

    manifest_path = BATCH_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    return manifest_path


def main():
    """Generate all test batches."""
    print("=" * 60)
    print("LinguAI Comprehensive Test Generator")
    print("=" * 60)

    all_files = {}

    # Generate all batches
    all_files["batch_1_extended_duration"] = generate_batch_1()
    all_files["batch_2_format_variety"] = generate_batch_2()
    all_files["batch_3_phonetic_patterns"] = generate_batch_3()
    all_files["batch_4_edge_cases"] = generate_batch_4()
    all_files["batch_5_clinical_research"] = generate_batch_5()

    # Generate manifest
    manifest_path = generate_manifest(all_files)

    # Summary
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE")
    print("=" * 60)

    total_files = sum(len(files) for files in all_files.values())
    total_size = sum(f.stat().st_size for files in all_files.values() for f in files)

    print(f"\nTotal files generated: {total_files}")
    print(f"Total size: {total_size / 1024 / 1024:.2f} MB")
    print(f"Manifest: {manifest_path}")
    print(f"\nBatch breakdown:")

    for batch_name, files in all_files.items():
        batch_size = sum(f.stat().st_size for f in files)
        print(f"  {batch_name}: {len(files)} files ({batch_size / 1024 / 1024:.2f} MB)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
