import type { CirclePointStyle, IPointOptions } from '@/types/Plot/Point.ts'

export interface IndexPointStyle extends CirclePointStyle {
  'text-size'?: number
}

export interface IIndexPointOptions extends IPointOptions<IndexPointStyle> {
  index: number
  style?: IndexPointStyle
}
