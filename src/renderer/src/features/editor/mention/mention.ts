import Mention from '@tiptap/extension-mention'
import type { Item } from '@shared/types'
import { makeMentionSuggestion } from './suggestion'

/** 멘션 후보로 노출할 아이템(폴더 제외)을 담는 가변 홀더.
 *  에디터는 1회 생성되므로, React 렌더마다 이 홀더를 갱신해 최신 목록을 참조한다. */
export interface MentionSource {
  items: Item[]
}

/**
 * '@' 트리거로 프로젝트 내 다른 아이템을 본문에 멘션한다.
 * 선택 시 data-id 를 가진 멘션 노드를 삽입한다(클릭 → 라우팅, 저장 시 자동 링크 동기화).
 */
export function createMention(source: MentionSource) {
  return Mention.configure({
    HTMLAttributes: { class: 'mention' },
    renderHTML({ options, node }) {
      return [
        'span',
        { ...options.HTMLAttributes, 'data-id': node.attrs.id },
        `@${node.attrs.label ?? node.attrs.id}`
      ]
    },
    suggestion: makeMentionSuggestion(source)
  })
}
