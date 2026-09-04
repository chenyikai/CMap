import type { LngLatLike, MapOptions, PopupOptions } from 'mapbox-gl'

export interface BeforeRemoveEvent {
  /**
   * 阻止销毁的方法
   * @param isCancel - true: 阻止销毁; false: 继续销毁
   */
  cancel: () => void
  next: () => void
}

export enum MapType {
  LAND = 'land',
  SATELLITE = 'satellite',
}

export interface FormatOptions {
  value: string | number
  data: object
}

export interface InfoFormConfig {
  label: string | number

  prop: string | number

  format(options: FormatOptions): string
}

export type CustomPopupOptions = PopupOptions & {
  center: LngLatLike

  config: InfoFormConfig[]

  data: object

  template: string
}

export interface ICMapOptions extends MapOptions {
  type?: MapType
  TDTToken?: string
  http2?: boolean
}
