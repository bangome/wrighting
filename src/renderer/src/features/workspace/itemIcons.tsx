import {
  Archive,
  FileText,
  Folder,
  LayoutGrid,
  Route,
  User,
  MapPin,
  Box,
  Building2,
  Lightbulb,
  Calendar,
  Globe,
  Layers,
  StickyNote,
  type LucideIcon
} from 'lucide-react'
import type { Item } from '@shared/types'

/** 아이템 종류별 아이콘 (스크린샷 트리 아이콘과 매칭) */
export function iconFor(item: Pick<Item, 'type' | 'sheet_subtype' | 'icon'>): LucideIcon {
  if (item.type === 'folder') {
    if (item.icon === 'users') return User
    if (item.icon === 'route') return Route
    if (item.icon === 'archive') return Archive
    return Folder
  }
  if (item.type === 'document') return FileText
  if (item.type === 'notes') return StickyNote
  if (item.type === 'plotboard') return Route
  if (item.type === 'canvas') return LayoutGrid
  if (item.type === 'sheet') {
    switch (item.sheet_subtype) {
      case 'event':
        return Calendar
      case 'place':
        return MapPin
      case 'item':
        return Box
      case 'organization':
        return Building2
      case 'worldview':
        return Globe
      case 'concept':
        return Lightbulb
      case 'other':
        return Layers
      default:
        return User
    }
  }
  return FileText
}
