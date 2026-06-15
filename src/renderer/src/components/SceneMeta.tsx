import { useEffect, useRef, useState } from 'react'
import type { Project, Scene } from '@shared/types'

interface Props {
  dir: string
  scene: Scene
  onSaved: (project: Project) => void
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 씬 메타데이터 인스펙터 — 시놉시스 / 절단 / 심는·회수 복선(ID) */
export function SceneMeta({ dir, scene, onSaved }: Props): JSX.Element {
  const [open, setOpen] = useState(true)
  const [synopsis, setSynopsis] = useState(scene.synopsis ?? '')
  const [cliffhanger, setCliffhanger] = useState(scene.cliffhanger ?? '')
  const [plant, setPlant] = useState((scene.plant ?? []).join(', '))
  const [payoff, setPayoff] = useState((scene.payoff ?? []).join(', '))
  const [saved, setSaved] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dirtyRef = useRef(false)
  const latest = useRef({ dir, id: scene.id, synopsis, cliffhanger, plant, payoff })
  latest.current = { dir, id: scene.id, synopsis, cliffhanger, plant, payoff }

  function scheduleSave(): void {
    dirtyRef.current = true
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void save(), 600)
  }

  /** 디스크에 기록만 한다(로컬 상태 갱신 없음) — 언마운트 flush 에서도 안전 */
  function persist(): Promise<Project> {
    const c = latest.current
    return window.api.updateSceneMeta(c.dir, c.id, {
      synopsis: c.synopsis || undefined,
      cliffhanger: c.cliffhanger || undefined,
      plant: parseList(c.plant),
      payoff: parseList(c.payoff)
    })
  }

  async function save(): Promise<void> {
    const project = await persist()
    dirtyRef.current = false
    setSaved(true)
    onSaved(project)
  }

  // 씬 전환/언마운트 시 미저장분 flush (latest ref 기준이라 안전)
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (dirtyRef.current) void persist().then(onSaved)
    }
  }, [scene.id])

  return (
    <section className={`scene-meta${open ? '' : ' collapsed'}`}>
      <header className="scene-meta-head" onClick={() => setOpen((v) => !v)}>
        <span>{open ? '▾' : '▸'} 씬 정보</span>
        <span className="save-status">{saved ? '저장됨' : '편집 중…'}</span>
      </header>
      {open && (
        <div className="scene-meta-body">
          <label>
            한 줄 시놉시스
            <input
              value={synopsis}
              onChange={(e) => {
                setSynopsis(e.target.value)
                scheduleSave()
              }}
              placeholder="이 씬에서 무슨 일이 일어나는가"
            />
          </label>
          <label>
            절단신공 (클리프행어)
            <textarea
              rows={2}
              value={cliffhanger}
              onChange={(e) => {
                setCliffhanger(e.target.value)
                scheduleSave()
              }}
              placeholder="이 회차를 끝내는 한 방"
            />
          </label>
          <div className="meta-cols">
            <label>
              심는 복선 (ID, 쉼표)
              <input
                value={plant}
                onChange={(e) => {
                  setPlant(e.target.value)
                  scheduleSave()
                }}
                placeholder="M-01, F-10"
              />
            </label>
            <label>
              회수 복선 (ID, 쉼표)
              <input
                value={payoff}
                onChange={(e) => {
                  setPayoff(e.target.value)
                  scheduleSave()
                }}
                placeholder="M-02"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  )
}
