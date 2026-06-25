import { useEffect, useState } from 'react'

/** CSS 미디어 쿼리 매칭 여부를 구독한다 (반응형 레이아웃 분기용). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (): void => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** md 브레이크포인트(768px) 미만 = 모바일/좁은 화면 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
