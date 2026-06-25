import { Link, useParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { extractBlocks } from '../features/export/blocks'
import { useSharedDocument } from '../lib/sharedDocuments'

function SharedDocBody({
  blocks
}: {
  blocks: ReturnType<typeof extractBlocks>
}): JSX.Element {
  if (blocks.length === 0) {
    return <p className="text-text-faint">공유된 문서에 아직 본문이 없습니다.</p>
  }

  return (
    <div className="flex flex-col gap-4 leading-8 text-text">
      {blocks.map((block, idx) => {
        const key = `${idx}-${block.heading}-${block.text.slice(0, 12)}`
        if (block.heading === 1) {
          return (
            <h2 key={key} className="mt-6 text-xl font-semibold leading-snug first:mt-0">
              {block.text}
            </h2>
          )
        }
        if (block.heading === 2) {
          return (
            <h3 key={key} className="mt-5 text-lg font-semibold leading-snug first:mt-0">
              {block.text}
            </h3>
          )
        }
        if (block.heading > 0) {
          return (
            <h4 key={key} className="mt-4 text-base font-semibold leading-snug first:mt-0">
              {block.text}
            </h4>
          )
        }
        return (
          <p key={key} className="whitespace-pre-wrap">
            {block.text || '\u00a0'}
          </p>
        )
      })}
    </div>
  )
}

export function SharedDocument(): JSX.Element {
  const { token } = useParams()
  const { data, isLoading, error } = useSharedDocument(token)

  let content: JSX.Element
  if (isLoading) {
    content = <p className="text-text-faint">공유 문서를 불러오는 중...</p>
  } else if (error) {
    content = <p className="text-danger">공유 문서를 불러오지 못했습니다.</p>
  } else if (!data) {
    content = <p className="text-text-faint">공유 링크가 만료되었거나 존재하지 않습니다.</p>
  } else {
    content = (
      <>
        <header className="mb-8 border-b border-border pb-5">
          <div className="mb-3 flex items-center gap-2 text-xs text-text-faint">
            <FileText size={14} />
            공유 문서
          </div>
          <h1 className="text-2xl font-bold leading-tight">{data.title}</h1>
        </header>
        <SharedDocBody blocks={extractBlocks(data.content)} />
      </>
    )
  }

  return (
    <main className="min-h-full bg-bg px-5 py-8 text-text sm:px-8">
      <article className="mx-auto max-w-[720px]">{content}</article>
      <div className="mx-auto mt-10 max-w-[720px] border-t border-border pt-4 text-xs text-text-faint">
        <Link to="/login" className="text-accent hover:underline">
          wrighting으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
