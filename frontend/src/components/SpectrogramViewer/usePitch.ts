import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import type { PitchResponse, PitchOptions } from '../../types/api';

interface UsePitchOptions extends PitchOptions {
  enabled?: boolean;
}

export function usePitch(file: File | null, options: UsePitchOptions = {}) {
  const { enabled = true, ...apiOptions } = options;

  return useQuery<PitchResponse, Error>({
    queryKey: ['pitch', file?.name, file?.lastModified, apiOptions],
    queryFn: () => {
      if (!file) throw new Error('No file provided');
      return api.analyzePitch(file, apiOptions);
    },
    enabled: enabled && !!file,
    staleTime: Infinity,
  });
}
