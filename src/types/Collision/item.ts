import type { BBox } from 'rbush'

export type Id = string | number | undefined

/**
 * 初始基准点的位置
 */
export enum Directions {
  // TOP,
  // RIGHT,
  // BOTTOM,
  // LEFT,
  TOP_LEFT,
  TOP_RIGHT,
  BOTTOM_RIGHT,
  BOTTOM_LEFT,
  // CENTER,
}

/**
 * 范围值枚举
 */
export enum Scopes {
  MIN_X,
  MIN_Y,
  MAX_X,
  MAX_Y,
}

/**
 * bbox-范围 dir-初始基准点的位置 options-配置
 */
export interface CollisionItemOptions {
  id: string | number
  // center: BBox
  // top: BBox
  // bottom: BBox
  // left: BBox
  // right: BBox
  'top-left': BBox
  'top-right': BBox
  'bottom-left': BBox
  'bottom-right': BBox
}
