import type {
  HealthResponse,
  SpectrogramResponse,
  FormantResponse,
  PitchResponse,
  SpectrogramOptions,
  FormantOptions,
  PitchOptions,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text().catch(() => null);
    throw new APIError(
      `API error: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    );
  }
  return response.json();
}

export const api = {
  async healthCheck(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthResponse>(response);
  },

  async analyzeSpectrogram(
    file: File,
    options: SpectrogramOptions = {}
  ): Promise<SpectrogramResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.time_step !== undefined) {
      formData.append('time_step', String(options.time_step));
    }
    if (options.max_frequency !== undefined) {
      formData.append('max_frequency', String(options.max_frequency));
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/analyze/spectrogram`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<SpectrogramResponse>(response);
  },

  async analyzeFormants(
    file: File,
    options: FormantOptions = {}
  ): Promise<FormantResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.max_formant !== undefined) {
      formData.append('max_formant', String(options.max_formant));
    }
    if (options.time_step !== undefined) {
      formData.append('time_step', String(options.time_step));
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/analyze/formants`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<FormantResponse>(response);
  },

  async analyzePitch(
    file: File,
    options: PitchOptions = {}
  ): Promise<PitchResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.pitch_floor !== undefined) {
      formData.append('pitch_floor', String(options.pitch_floor));
    }
    if (options.pitch_ceiling !== undefined) {
      formData.append('pitch_ceiling', String(options.pitch_ceiling));
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/analyze/pitch`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<PitchResponse>(response);
  },
};

export { APIError };
export default api;
