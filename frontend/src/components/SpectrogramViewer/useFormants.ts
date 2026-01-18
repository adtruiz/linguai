import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import type { FormantResponse, FormantOptions } from '../../types/api';

interface UseFormantsOptions extends FormantOptions {
  enabled?: boolean;
}

export function useFormants(file: File | null, options: UseFormantsOptions = {}) {
  const { enabled = true, ...apiOptions } = options;

  return useQuery<FormantResponse, Error>({
    queryKey: ['formants', file?.name, file?.lastModified, apiOptions],
    queryFn: () => {
      if (!file) throw new Error('No file provided');
      return api.analyzeFormants(file, apiOptions);
    },
    enabled: enabled && !!file,
    staleTime: Infinity,
  });
}
