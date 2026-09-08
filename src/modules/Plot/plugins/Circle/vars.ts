import type {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  LayerSpecification,
} from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.CIRCLE

export const Z_INDEX = 3

export const CIRCLE_LAYER_NAME = 'mapbox-gl-plot-circle-layer'

export const CIRCLE_OUTLINE_LAYER_NAME = 'mapbox-gl-plot-circle-outline-layer'

export const CIRCLE_META = 'circle-shape'

export const DEFAULT_FILL_COLOR = '#009dff'

export const DEFAULT_FILL_OPACITY = 0.3

export const DEFAULT_LINE_WIDTH = 3

const circleColor: DataDrivenPropertyValueSpecification<ColorSpecification> = [
  'coalesce',
  ['get', 'fill-color'],
  DEFAULT_FILL_COLOR,
]

const circleOpacity: DataDrivenPropertyValueSpecification<number> = [
  'coalesce',
  ['get', 'fill-opacity'],
  DEFAULT_FILL_OPACITY,
]

const circleLineColor: DataDrivenPropertyValueSpecification<ColorSpecification> = [
  'coalesce',
  ['get', 'line-color'],
  circleColor,
]

const circleLineWidth: DataDrivenPropertyValueSpecification<number> = [
  'coalesce',
  ['get', 'line-width'],
  DEFAULT_LINE_WIDTH,
]

export const CIRCLE_LAYER: LayerSpecification = {
  id: CIRCLE_LAYER_NAME,
  type: 'fill',
  filter: [
    'all',
    ['==', '$type', 'Polygon'],
    ['==', 'meta', CIRCLE_META],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  paint: {
    'fill-color': circleColor,
    'fill-opacity': circleOpacity,
  },
  layout: {},
}

export const CIRCLE_OUTLINE_LAYER: LayerSpecification = {
  id: CIRCLE_OUTLINE_LAYER_NAME,
  type: 'line',
  filter: [
    'all',
    ['==', '$type', 'Polygon'],
    ['==', 'meta', CIRCLE_META],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  paint: {
    'line-color': circleLineColor,
    'line-width': circleLineWidth,
  },
  layout: {},
}

export const LAYER_LIST: SortLayer[] = [
  {
    layer: CIRCLE_LAYER,
    zIndex: Z_INDEX,
  },
  {
    layer: CIRCLE_OUTLINE_LAYER,
    zIndex: Z_INDEX,
  },
]
