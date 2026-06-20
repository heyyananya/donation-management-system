import { QueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      onError: (err) => {
        const msg = err?.response?.data?.message || err?.message || 'Something went wrong';
        toast.error(msg);
      },
    },
  },
});
