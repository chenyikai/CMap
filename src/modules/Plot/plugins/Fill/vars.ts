import type {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  LayerSpecification,
} from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.Fill

export const Z_INDEX = 3

export const FILL_LAYER_NAME = 'mapbox-gl-plot-fill-layer'

export const FILL_CLOSED_LINE_LAYER_NAME = 'mapbox-gl-plot-closed-line-layer'

export const FILL_META = 'fill-shape'

export const DEFAULT_FILL_COLOR = '#009dff'

export const DEFAULT_FILL_OPACITY = 0.3

const fillColor: DataDrivenPropertyValueSpecification<ColorSpecification> = [
  'coalesce',
  ['get', 'fill-color'],
  DEFAULT_FILL_COLOR,
]

const fillOpacity: DataDrivenPropertyValueSpecification<number> = [
  'coalesce',
  ['get', 'fill-opacity'],
  DEFAULT_FILL_OPACITY,
]

export const FILL_LAYER: LayerSpecification = {
  id: FILL_LAYER_NAME,
  type: 'fill',
  filter: [
    'all',
    ['==', '$type', 'Polygon'],
    ['==', 'meta', FILL_META],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  paint: {
    'fill-color': fillColor,
    'fill-opacity': fillOpacity,
  },
  layout: {},
}

export const FILL_CLOSED_LINE_LAYER: LayerSpecification = {
  id: FILL_CLOSED_LINE_LAYER_NAME,
  type: 'line',
  filter: [
    'all',
    ['==', '$type', 'Polygon'],
    ['==', 'meta', FILL_META],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  paint: {
    'line-color': fillColor,
    'line-width': ['case', ['boolean', ['feature-state', 'create'], false], 3, 0],
    // 'line-width': 3,
  },
  layout: {},
}

export const LAYER_LIST: SortLayer[] = [
  {
    layer: FILL_LAYER,
    zIndex: Z_INDEX,
  },
  {
    layer: FILL_CLOSED_LINE_LAYER,
    zIndex: Z_INDEX,
  },
]
