import type { LayerSpecification } from 'mapbox-gl'

export const NAME = 'Track'

export const TRACK_SOURCE_NAME = 'mapbox-gl-track-source'

export const TRACK_ARROW_LAYER_NAME = 'mapbox-gl-track-arrow-layer'

export const TRACK_ICON_LAYER_NAME = 'mapbox-gl-track-icon-layer'

export const TRACK_LINE_LAYER_NAME = 'mapbox-gl-track-line-layer'

export const TRACK_ARROW_LAYER: LayerSpecification = {
  id: 'track-line-text',
  source: TRACK_SOURCE_NAME,
  type: 'symbol',
  layout: {
    'symbol-placement': 'line',
    'symbol-spacing': 250, // 图标间隔，默认为250
    'icon-image': 'track-arrow', // 箭头图标
    'icon-size': 0.3,
    'icon-rotate': -90,
    'icon-allow-overlap': true, // 开启避让
  },
  paint: {},
}

export const TRACK_ICON_LAYER: LayerSpecification = {
  id: TRACK_ICON_LAYER_NAME,
  source: TRACK_SOURCE_NAME,
  type: 'symbol',
  filter: ['==', '$type', 'Point'],
  layout: {
    'icon-image': ['get', 'icon'],
    'icon-size': ['get', 'iconSize'],
    'icon-allow-overlap': false, // 开启避让
    'symbol-sort-key': ['get', 'type'], // 权重排序
  },
}

export const TRACK_LINE_LAYER: LayerSpecification = {
  id: TRACK_LINE_LAYER_NAME,
  source: TRACK_SOURCE_NAME,
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString']],
  paint: {
    'line-color': '#f00',
    'line-width': 3,
  },
  layout: {},
}

export const LAYER_LIST: LayerSpecification[] = [
  TRACK_LINE_LAYER,
  TRACK_ARROW_LAYER,
  TRACK_ICON_LAYER,
]

export const START_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="74" height="74" viewBox="0 0 74 74" fill="none"><circle cx="37" cy="37" r="32" stroke="rgba(172, 51, 193, 1)" stroke-width="10"      fill="#AC33C1" ></circle><path d="M36.4 50.84C40.84 51.08 45.24 51.08 45.24 51.08C50.52 51.08 55.12 50.8 55.12 50.8L54.48 54.36C50.16 54.64 45.24 54.64 45.24 54.64C40.32 54.64 35.96 54.36 35.96 54.36C31.16 54.08 28.16 52.72 28.16 52.72C25.16 51.36 23.4 48.36 23.4 48.36C22.64 51.96 20.84 55.72 20.84 55.72L18 53.52C19.16 51.04 19.76 48.94 19.76 48.94C20.36 46.84 20.62 44.26 20.62 44.26C20.88 41.68 20.88 37.64 20.88 37.64L24.2 37.64C24.2 40.92 24.04 43.12 24.04 43.12C25.16 46.52 27.28 48.24 27.28 48.24L27.28 35.44L18.68 35.44L18.68 32.08L26.32 32.08L26.32 27.12L20.08 27.12L20.08 23.72L26.32 23.72L26.32 19L29.84 19L29.84 23.72L35.64 23.72L35.64 27.12L29.84 27.12L29.84 32.08L36.76 32.08L36.76 35.44L30.72 35.44L30.72 40.96L36.36 40.96L36.36 44.32L30.72 44.32L30.72 49.96C33 50.64 36.4 50.84 36.4 50.84ZM48.96 30.88L48.96 24.64L37.8 24.64L37.8 21.12L52.44 21.12L52.44 34.4L41.84 34.4L41.84 41.52C41.84 42.72 42.02 43.24 42.02 43.24C42.2 43.76 42.68 43.98 42.68 43.98C43.16 44.2 44.28 44.32 44.28 44.32C44.88 44.36 46 44.36 46 44.36C47.12 44.36 47.72 44.32 47.72 44.32C48.88 44.2 49.44 43.98 49.44 43.98C50 43.76 50.22 43.28 50.22 43.28C50.44 42.8 50.52 41.8 50.52 41.8C50.68 39.72 50.68 38.44 50.68 38.44L54.08 39.24C53.96 41.12 53.8 43 53.8 43C53.6 45.04 53.16 45.98 53.16 45.98C52.72 46.92 51.72 47.3 51.72 47.3C50.72 47.68 48.64 47.8 48.64 47.8C46.8 47.88 45.88 47.88 45.88 47.88C44.96 47.88 43.12 47.8 43.12 47.8C41.2 47.68 40.22 47.2 40.22 47.2C39.24 46.72 38.8 45.64 38.8 45.64C38.36 44.56 38.36 42.44 38.36 42.44L38.36 30.88L48.96 30.88Z"   fill="#FFFFFF" ></path></svg>'

export const END_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="74" height="74" viewBox="0 0 74 74" fill="none"><circle cx="37" cy="37" r="32" stroke="rgba(172, 51, 193, 1)" stroke-width="10"      fill="#AC33C1" ></circle><path d="M45.6 33.64C49.28 36.12 55.28 38.24 55.28 38.24L54 41.8C50.48 40.32 47.78 38.88 47.78 38.88C45.08 37.44 42.92 35.8 42.92 35.8C38.76 38.84 32.04 41.6 32.04 41.6L30.4 38.4C36.28 36.2 40.24 33.56 40.24 33.56C38.2 31.6 36.12 28.8 36.12 28.8C34.56 30.92 32.68 32.88 32.68 32.88L30.72 30.36C32.88 28.08 35.08 24.52 35.08 24.52C37.28 20.96 38.4 18 38.4 18L41.64 18.92C41.2 19.96 40.24 22.04 40.24 22.04L52.04 22.04L52.04 25.48C50.56 27.96 49.02 29.96 49.02 29.96C47.48 31.96 45.6 33.64 45.6 33.64ZM20.76 33.44C19.96 33.48 19 33.76 19 33.76L18.2 30.24C18.72 30.04 18.98 29.82 18.98 29.82C19.24 29.6 19.56 29.2 19.56 29.2C20.44 28 22.06 24.68 22.06 24.68C23.68 21.36 24.92 18.2 24.92 18.2L28.04 19.4C26.8 22.28 25.24 25.4 25.24 25.4C23.68 28.52 22.6 30.04 22.6 30.04C25.92 29.56 26.76 29.44 26.76 29.44C28.16 26.68 29.28 24.16 29.28 24.16L32.16 25.52C30.52 28.92 28.16 33.22 28.16 33.22C25.8 37.52 24.4 39.48 24.4 39.48L27.36 38.76L29.76 38.16L29.84 41.68C29.28 41.72 26.86 42.2 26.86 42.2C24.44 42.68 22.52 43.08 22.52 43.08C21.96 43.2 20.84 43.52 20.84 43.52L19.92 43.76L19.08 40.12C19.96 39.76 20.34 39.48 20.34 39.48C20.72 39.2 21.2 38.64 21.2 38.64C22.84 36.6 24.92 32.84 24.92 32.84C22.24 33.28 20.76 33.44 20.76 33.44ZM38.08 25.92C40.2 29.2 42.88 31.52 42.88 31.52C45.56 29.16 48.12 25.4 48.12 25.4L38.4 25.4L38.08 25.92ZM37.6 39.4L40.8 40.4L49.4 43.08L48.12 46.52C45.76 45.68 42.22 44.5 42.22 44.5C38.68 43.32 36.64 42.76 36.64 42.76L37.6 39.4ZM18 49.08C18.68 48.96 21.08 48.4 21.08 48.4C23.48 47.84 25.2 47.44 25.2 47.44C30.76 46.2 31.08 46.12 31.08 46.12L31.28 49.6C30.12 49.8 22.24 51.6 22.24 51.6C18.8 52.44 18.48 52.48 18.48 52.48L18 49.08ZM34.4 46.48C37.24 47.24 42.46 48.82 42.46 48.82C47.68 50.4 51.12 51.52 51.12 51.52L49.92 55.04C46.44 53.8 41.38 52.2 41.38 52.2C36.32 50.6 33.44 49.84 33.44 49.84L34.4 46.48Z"   fill="#FFFFFF" ></path></svg>'

export const NORMAL_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="74" height="74" viewBox="0 0 74 74" fill="none"><circle cx="37" cy="37" r="32" stroke="rgba(172, 51, 193, 1)" stroke-width="10"      fill="#FFFFFF" ></circle></svg>'

export const ARROW_ICON =
  '<svg t="1769503360247" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="24046" width="64" height="64"><path d="M509.093 894.223l-447.093-761.539 452.861 219.23099999 447.139-222.13799999z" p-id="24047" fill="#d81e06"></path></svg>'
