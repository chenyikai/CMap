import type { LayerSpecification } from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import {
  DEFAULT_TEXT_COLOR as POINT_DEFAULT_TEXT_COLOR,
  TEXT_Z_INDEX,
} from '@/modules/Plot/plugins/Point/vars.ts'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.INDEX_POINT
export const POINT_INDEX_LAYER_NAME = 'mapbox-gl-plot-point-index-layer'
export const DEFAULT_TEXT_COLOR = POINT_DEFAULT_TEXT_COLOR

const baseTextSize = ['coalesce', ['get', 'text-size'], 12]

export const POINT_INDEX_LAYER: LayerSpecification = {
  id: POINT_INDEX_LAYER_NAME,
  type: 'symbol',
  filter: [
    'all',
    ['==', '$type', 'Point'],
    ['==', 'meta', 'circle'],
    ['==', 'subMeta', 'indexPoint'],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  paint: {
    'text-color': ['coalesce', ['get', 'text-color'], DEFAULT_TEXT_COLOR],
  },
  layout: {
    'text-field': ['get', 'index'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-anchor': 'center',
    'text-allow-overlap': true,
    // 最外层使用 interpolate 随层级线性变化
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      5,
      ['*', baseTextSize, 0.5],
      14,
      ['*', baseTextSize, 1],
      22,
      ['*', baseTextSize, 2.5],
    ],
  },
}

export const LAYER_LIST: SortLayer[] = [
  {
    layer: POINT_INDEX_LAYER,
    zIndex: TEXT_Z_INDEX,
  },
]
