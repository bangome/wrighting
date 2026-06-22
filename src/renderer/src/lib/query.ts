import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get, set, del } from 'idb-keyval'

/** 오프라인 캐시 보존 기간 (7일) */
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 다기기 동기화: 창 포커스 시 리페치로 최신 상태 반영
      refetchOnWindowFocus: true,
      staleTime: 10_000,
      // 오프라인 읽기: 캐시를 오래 보존하고, 네트워크가 없어도 캐시를 먼저 제공
      gcTime: CACHE_MAX_AGE,
      networkMode: 'offlineFirst',
      retry: 1
    }
  }
})

/** IndexedDB 기반 비동기 캐시 영속화 (오프라인 로컬 읽기) */
export const queryPersister = createAsyncStoragePersister({
  key: 'wrighting-query-cache',
  storage: {
    getItem: async (key) => (await get<string>(key)) ?? null,
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key)
  },
  throttleTime: 1000
})

export const persistMaxAge = CACHE_MAX_AGE
