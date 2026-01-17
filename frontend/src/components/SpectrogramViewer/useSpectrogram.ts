import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import type { SpectrogramResponse, SpectrogramOptions } from '../../types/api';

interface UseSpectrogramOptions extends SpectrogramOptions {
  enabled?: boolean;
}

export function useSpectrogram(file: File | null, options: UseSpectrogramOptions = {}) {
  const { enabled = true, ...apiOptions } = options;

  return useQuery<SpectrogramResponse, Error>({
    queryKey: ['spectrogram', file?.name, file?.lastModified, apiOptions],
    queryFn: () => {
      if (!file) throw new Error('No file provided');
      return api.analyzeSpectrogram(file, apiOptions);
    },
    enabled: enabled && !!file,
    staleTime: Infinity,
  });
}
