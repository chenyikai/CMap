import type { Units } from '@turf/turf'
import type { ColorSpecification, DataDrivenPropertyValueSpecification, LngLat } from 'mapbox-gl'

import type { IPoiOptions } from '@/types/Plot/Poi.ts'
import type { PointStyle } from '@/types/Plot/Point.ts'

export interface CircleStyle {
  'fill-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
  'fill-opacity'?: DataDrivenPropertyValueSpecification<number>
  'line-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
  'line-width'?: DataDrivenPropertyValueSpecification<number>
}

export interface ICircleOptions extends IPoiOptions {
  center?: LngLat
  radius?: number
  unit?: Units
  steps?: number
  style?: CircleStyle
  centerStyle?: PointStyle
  radiusStyle?: PointStyle
}
