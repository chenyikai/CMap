import type { LngLat, Map, Point } from 'mapbox-gl'

import type { BaseShip } from '@/modules/Ship/BaseShip.ts'

export interface IBaseShipOptions {
  id: string | number
  name: string
  position: LngLat
  width?: number
  height?: number
  direction: number
  speed: number
  hdg: number
  cog: number
  rot: number
  type: string
  statusId?: number
  status?: string
  time: Date
  tooltip?: boolean
  immediate?: boolean
  realZoom?: number
  top?: number
  left?: number
  right?: number
  bottom?: number
  icon?: string
}

/**
 * 方向点 拐点 船首 船首右舷 船尾右舷 右船尾 左船尾 船尾左舷 船首左舷
 */
export interface Shape {
  leftDirection: Point
  rightDirection: Point
  turn: Point
  head: Point
  rightBow: Point
  rightQuarter: Point
  rightStern: Point
  leftStern: Point
  leftQuarter: Point
  leftBow: Point
}

export type Orientation = 'static' | 'left' | 'right' | 'straight'

export type state = 'hover' | 'focus'

export interface BaseShipConstructor<T extends IBaseShipOptions = any> {
  new (map: Map, options: T): BaseShip<T>
  readonly NAME: string
}

export enum ShipEventEnum {
  CREATE = 'Create',
  UPDATE = 'Update',
  RESIDENT = 'Resident',
}
