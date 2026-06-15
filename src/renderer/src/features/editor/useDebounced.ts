import { useEffect, useRef } from 'react'

/** value가 바뀌면 delay 후 fn 실행 (디바운스). 언마운트 시 즉시 flush. */
export function useDebouncedEffect(fn: () => void, deps: unknown[], delay = 800): void {
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    const t = setTimeout(() => fnRef.current(), delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
