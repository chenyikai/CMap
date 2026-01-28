import type { LngLat } from 'mapbox-gl'
import type { BBox } from 'rbush'

export type Anchor =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export interface AllAnchor {
  center: BBox
  top: BBox
  bottom: BBox
  left: BBox
  right: BBox
  'top-left': BBox
  'top-right': BBox
  'bottom-left': BBox
  'bottom-right': BBox
}

export interface SimpleAnchor {
  'top-left': BBox
  'top-right': BBox
  'bottom-left': BBox
  'bottom-right': BBox
}

export interface ITooltipOptions {
  id: string | number
  visible?: boolean
  className?: string
  position: LngLat
  element?: HTMLElement
  offsetX?: number
  offsetY?: number
  anchor?: Anchor
}
