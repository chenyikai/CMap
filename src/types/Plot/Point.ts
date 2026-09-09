import type EventEmitter from 'eventemitter3'
import type * as GeoJSON from 'geojson'
import type { ColorSpecification, DataDrivenPropertyValueSpecification, LngLat } from 'mapbox-gl'

import type {
  PointCreateEvent,
  PointResidentEvent,
  PointUpdateEvent,
} from '@/modules/Plot/plugins/Events/PointEvents.ts'
import type { IconPointStyle } from '@/types/Plot/IconPoint.ts'
import type { IndexPointStyle } from '@/types/Plot/IndexPoint.ts'
import type { IPoiOptions, PlotVisibility, PointPosition } from '@/types/Plot/Poi.ts'

export interface PointTextStyle {
  'text-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
  'text-size'?: number
  'text-offset'?: [number, number]
  'text-rotate'?: number
}

export interface CirclePointStyle extends PointTextStyle {
  'circle-stroke-width'?: number
  'circle-stroke-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
  'circle-radius'?: number
  'circle-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
}

export type PointStyle = CirclePointStyle | IndexPointStyle | IconPointStyle

export interface IPointOptions<TStyle = PointStyle> extends IPoiOptions {
  position?: PointPosition
  style?: TStyle
  // edit?: boolean
  properties?: Record<string, any>
}

export interface PointInstance<T extends IPointOptions = IPointOptions> {
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-expect-error
  // new (map: Map, options: T): this
  //
  // // --- 静态属性 (源自 C) ---
  // NAME: PlotType

  // --- 基础属性 (源自 A 与 C) ---
  options: T
  readonly SOURCE: string
  LAYER: string

  // --- 事件属性 (源自 C) ---
  residentEvent: PointResidentEvent
  updateEvent: PointUpdateEvent
  createEvent: PointCreateEvent

  // --- Getters (源自 A 与 C，C 权重更高) ---
  readonly id: string // C 中重写为 string，覆盖了 A 的 T['id']
  readonly isEdit: boolean
  readonly isCreate: boolean
  readonly visibility: PlotVisibility
  readonly center: LngLat | null
  readonly geometry: GeoJSON.Point | null // 继承 A 但由 C 具体化了泛型

  // --- 生命周期及基础方法 (源自 A 与 C) ---
  onAdd(): void
  onRemove(): void

  // --- GeoJSON 相关 (源自 C) ---
  // C 中重写，去除了 A 返回值末尾的 `| null` 联合类型
  getFeature(): GeoJSON.Feature<GeoJSON.Point | null>

  // --- 交互与状态控制方法 (源自 A 与 C) ---
  start(): void
  stop(): void
  edit(): void
  unedit(): void
  focus(): void
  unfocus(): void
  select(): void
  unselect(): void

  // --- 数据与渲染方法 (源自 A 与 C) ---
  // Point 接受 Mapbox 的完整 LngLatLike 输入，并在内部归一化为 LngLat。
  move(position: PointPosition): void
  update(options: T): void
  remove(): void
  render(): void
  show(): void
  hide(): void

  // --- Mapbox 状态管理方法 (源自 A) ---
  setState(states: Record<string, unknown>): void
  getState(): Record<string, unknown> | null | undefined

  on<T extends EventEmitter.EventNames<string>>(
    event: T,
    fn: EventEmitter.EventListener<string, T>,
    context?: any,
  ): this

  off<T extends EventEmitter.EventNames<string>>(
    event: T,
    fn?: EventEmitter.EventListener<string, T>,
    context?: any,
    once?: boolean,
  ): this
}
