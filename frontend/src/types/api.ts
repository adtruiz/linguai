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
  end: number;
  text: string;
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
