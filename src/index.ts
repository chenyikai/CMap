import './styles/index.scss'

// 公共类型入口。interface/type 会在构建时擦除，enum 会保留为运行时导出。
export * from './types'

/**
 * 缓存
 */
export { default as Cache } from './core/Cache'
/**
 * 碰撞
 */
export { default as Collision } from './core/Collision'
export { default as CollisionItem } from './core/Collision/CollisionItem'
/**
 * 图标管理
 */
export { EventState } from './core/EventState'
export { default as Focus } from './core/Focus'
export { default as IconManager } from './core/IconManager'
export { Module } from './core/Module'
export { Context } from './core/Module/Context'
export type { SortLayer } from './core/ResourceRegister'
export { default as ResourceRegister } from './core/ResourceRegister'
export { Tooltip } from './core/Tooltip'
export { CMap } from './modules/CMap'
export { ArrowLine } from './modules/Plot/plugins/ArrowLine'
export { Circle } from './modules/Plot/plugins/Circle'
export * as CircleVars from './modules/Plot/plugins/Circle/vars.ts'
export { Poi } from './modules/Plot/plugins/Poi'
// export * as ArrowLineVars from './modules/Plot/plugins/ArrowLine/vars.ts'
export { Fill } from './modules/Plot/plugins/Fill'
export * as FillVars from './modules/Plot/plugins/Fill/vars.ts'
export { IconPoint } from './modules/Plot/plugins/IconPoint'
export * as IconPointVars from './modules/Plot/plugins/IconPoint/vars.ts'
export { IndexLine } from './modules/Plot/plugins/IndexLine'
// export * as IndexLineVars from './modules/Plot/plugins/IndexLine/vars.ts'
export { EventManager } from './core/EventManager'
export {
  CircleBaseEvent,
  CircleCreateEvent,
  CircleResidentEvent,
  CircleUpdateEvent,
} from './modules/Plot/plugins/Events/CircleEvents'
export {
  FillBaseEvent,
  FillCreateEvent,
  FillResidentEvent,
  FillUpdateEvent,
} from './modules/Plot/plugins/Events/FillEvents'
export {
  LineBaseEvent,
  LineCreateEvent,
  LineResidentEvent,
  LineUpdateEvent,
} from './modules/Plot/plugins/Events/LineEvents'
export {
  PointBaseEvent,
  PointCreateEvent,
  PointResidentEvent,
  PointUpdateEvent,
} from './modules/Plot/plugins/Events/PointEvents'
export { IndexPoint } from './modules/Plot/plugins/IndexPoint'
export * as IndexPointVars from './modules/Plot/plugins/IndexPoint/vars.ts'
export { Line } from './modules/Plot/plugins/Line'
export * as LineVars from './modules/Plot/plugins/Line/vars.ts'
export { Point } from './modules/Plot/plugins/Point'
export * as PointVars from './modules/Plot/plugins/Point/vars.ts'
export { default as Ship } from './modules/Ship'
export { BaseShip } from './modules/Ship/BaseShip'
export { ResidentEvent } from './modules/Ship/Events/ResidentEvent'
export { AisShip } from './modules/Ship/plugins/AisShip'
export * as ShipVars from './modules/Ship/vars'
export { Track } from './modules/Track/index'
export * as TrackVars from './modules/Track/vars'
