import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

type QueryKey = readonly unknown[];

export function useApiQuery<TData = unknown>(
  key: QueryKey,
  url: string,
  options?: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TData, Error, TData, QueryKey>({
    queryKey: key,
    queryFn: () => api.get<TData>(url),
    ...options,
  });
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  url: string,
  method: 'post' | 'patch' | 'put' | 'delete' = 'post',
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) =>
      (api[method] as typeof api.post)<TData>(url, variables as any),
    ...options,
  });
}
