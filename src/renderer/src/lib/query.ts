import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 다기기 동기화: 창 포커스 시 리페치로 최신 상태 반영
      refetchOnWindowFocus: true,
      staleTime: 10_000,
      retry: 1
    }
  }
})
