import { useMatch } from 'react-router-dom'

/**
 * 현재 열린 항목 id.
 * Workspace는 `/p/:projectId/*` splat 라우트라 그 레벨(TopBar·ContextBar·RightPane)에서는
 * useParams()로 itemId를 못 얻는다. 절대경로 매칭으로 직접 추출한다.
 */
export function useCurrentItemId(): string | undefined {
  return useMatch('/p/:projectId/i/:itemId')?.params.itemId
}
