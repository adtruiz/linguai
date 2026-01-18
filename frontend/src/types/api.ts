// API types based on OpenAPI spec

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
}

export interface SpectrogramResponse {
  times: number[];
  frequencies: number[];
  intensities: number[][];
  duration: number;
  sample_rate: number;
}

export interface FormantResponse {
  times: number[];
  f1: (number | null)[];
  f2: (number | null)[];
  f3: (number | null)[];
  f4: (number | null)[];
}

export interface PitchResponse {
  times: number[];
  frequencies: (number | null)[];
  unit?: string;
}

export interface Annotation {
  id: string;
  tier: string;
  start: number;
  end: number;  // For point annotations, end equals start
  text: string;
  type: 'interval' | 'point';
}

export interface TierConfig {
  name: string;
  type: 'interval' | 'point';
}

export interface SpectrogramOptions {
  time_step?: number;
  max_frequency?: number;
}

export interface FormantOptions {
  max_formant?: number;
  time_step?: number;
}

export interface PitchOptions {
  pitch_floor?: number;
  pitch_ceiling?: number;
}

export interface WaveformResponse {
  times: number[];
  amplitudes: number[];
  duration: number;
  sample_rate: number;
  min_amplitude: number;
  max_amplitude: number;
}

export interface IntensityResponse {
  times: number[];
  values: number[];
  unit?: string;
}

export interface VoiceQualityResponse {
  // Jitter measures
  jitter_local: number | null;
  jitter_local_absolute: number | null;
  jitter_rap: number | null;
  jitter_ppq5: number | null;
  // Shimmer measures
  shimmer_local: number | null;
  shimmer_local_db: number | null;
  shimmer_apq3: number | null;
  shimmer_apq5: number | null;
  shimmer_apq11: number | null;
  // Harmonicity
  hnr: number | null;
  nhr: number | null;
  // Additional measures
  mean_pitch: number | null;
  pitch_stdev: number | null;
  voiced_fraction: number | null;
  num_voice_breaks: number | null;
  degree_of_voice_breaks: number | null;
}

export interface TierInfo {
  name: string;
  tier_type: 'interval' | 'point';
  xmin: number;
  xmax: number;
}

export interface TextGridImportResponse {
  duration: number;
  tiers: TierInfo[];
  annotations: Annotation[];
  total_annotations: number;
}

export interface WaveformOptions {
  time_step?: number;
  max_points?: number;
}

export interface IntensityOptions {
  time_step?: number;
  minimum_pitch?: number;
}

export interface VoiceQualityOptions {
  pitch_floor?: number;
  pitch_ceiling?: number;
}
