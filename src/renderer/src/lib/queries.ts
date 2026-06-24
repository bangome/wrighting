import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Project } from '@shared/types'
import { supabase } from './supabase'

/** 내 작품 목록 (최근 수정순) */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Project[]
    }
  })
}

/** 새 작품 생성 (기본 폴더·라벨·상태 시드 RPC) */
export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (title: string): Promise<Project> => {
      const { data, error } = await supabase.rpc('create_project', { p_title: title })
      if (error) throw error
      return data as Project
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] })
  })
}

/** 작품 이름 변경 */
export function useRenameProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from('projects').update({ title }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] })
  })
}

/** 작품 삭제 (cascade) */
export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] })
  })
}

/** 작품 표지 이미지 업로드 — covers 버킷에 upsert 후 cover_path 갱신 */
export function useUpdateProjectCover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }): Promise<void> => {
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(id, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { error } = await supabase.from('projects').update({ cover_path: id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] })
  })
}

/** 작품 표지 제거 */
export function useRemoveProjectCover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await supabase.storage.from('covers').remove([id])
      const { error } = await supabase.from('projects').update({ cover_path: null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] })
  })
}

/** 단일 작품 로드 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Project> => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId!)
        .single()
      if (error) throw error
      return data as Project
    }
  })
}
