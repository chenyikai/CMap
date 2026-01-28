import type { LngLat } from 'mapbox-gl'

export interface ITrackOptions {
  startLabel: string
  endLabel: string
}

export interface TrackItem {
  id: string
  pId: string
  index: number
  position: LngLat
  cog?: number
  sog?: number
  time: Date
  props?: Record<string, any>
}

export interface TrackItemWithLabel extends TrackItem {
  type: TooltipType
  visible: boolean
}

export enum TooltipType {
  START_END = 0, // 起终点 (最高)
  SHARP_TURN = 1, // 急转弯
  STOP_GO = 2, // 启停变化
  TIME_ANCHOR = 3, // 时间锚点
  NORMAL = 9, // 普通点
}
