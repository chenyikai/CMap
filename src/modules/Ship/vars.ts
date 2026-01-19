import type { LayerSpecification } from 'mapbox-gl'

import type { SvgIcon } from '@/types/IconManager'

export const NAME = 'Ais'

export const SHIP_SOURCE_NAME = 'mapbox-gl-ship-source'

export const SHIP_ICON_LAYER_NAME = 'mapbox-gl-ship-icon-layer'

export const SHIP_REAL_LAYER_NAME = 'mapbox-gl-ship-real-layer'

export const SHIP_REAL_OUTLINE_LAYER_NAME = 'mapbox-gl-ship-real-outline-layer'

export const SHIP_ICON_LAYER: LayerSpecification = {
  id: SHIP_ICON_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  filter: ['==', '$type', 'Point'],
  type: 'symbol',
  layout: {
    'icon-allow-overlap': true,
    'icon-image': ['get', 'icon'],
    'icon-rotate': ['get', 'direction'],
    'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.2, 19, 0.5],
  },
}

export const SHIP_REAL_LAYER: LayerSpecification = {
  id: SHIP_REAL_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  type: 'fill',
  layout: {},
  paint: {
    'fill-color': '#0f0',
  },
}

export const SHIP_REAL_OUTLINE_LAYER: LayerSpecification = {
  id: SHIP_REAL_OUTLINE_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  type: 'line',
  layout: {},
  paint: {
    'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#f00', '#000'],
    'line-width': 2,
  },
}

export const LAYER_LIST: LayerSpecification[] = [
  SHIP_ICON_LAYER,
  SHIP_REAL_LAYER,
  SHIP_REAL_OUTLINE_LAYER,
]

export const SHIP_ICON: SvgIcon[] = [
  {
    name: `${NAME}-$color-static`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="33px" height="49px" viewBox="0 0 33 49" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_nospeed</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_nospeed" fill="$color" stroke="#000000" stroke-width="2">\n' +
      '            <path d="M16.5,3.13354433 L31.6080922,48 L1.39190779,48 L16.5,3.13354433 Z" id="三角形"></path>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
  {
    name: `${NAME}-$color-static-active`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="33px" height="49px" viewBox="0 0 33 49" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_nospeed_select</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_nospeed_select" fill="$color" stroke="#FF0000" stroke-width="2">\n' +
      '            <path d="M16.5,3.13354433 L31.6080922,48 L1.39190779,48 L16.5,3.13354433 Z" id="三角形"></path>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
  {
    name: `${NAME}-$color-straight`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="33px" height="87px" viewBox="0 0 33 87" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_straight</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_straight" transform="translate(0, 1)" stroke="#000000" stroke-width="2">\n' +
      '            <path d="M16.5,40.1335443 L31.6080922,85 L1.39190779,85 L16.5,40.1335443 Z" id="三角形" fill="$color"></path>\n' +
      '            <line x1="16.5" y1="0.5" x2="16.5" y2="41.5" id="直线" stroke-linecap="square"></line>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
  {
    name: `${NAME}-$color-straight-active`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="33px" height="87px" viewBox="0 0 33 87" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_straight_select</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_straight_select" transform="translate(0, 1)" stroke="#FF0000" stroke-width="2">\n' +
      '            <path d="M16.5,40.1335443 L31.6080922,85 L1.39190779,85 L16.5,40.1335443 Z" id="三角形" fill="$color"></path>\n' +
      '            <line x1="16.5" y1="0.5" x2="16.5" y2="41.5" id="直线" stroke-linecap="square"></line>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
  {
    name: `${NAME}-$color-left`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="40px" height="87px" viewBox="0 0 40 87" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_left</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_left" transform="translate(20.5, 44) scale(-1, 1) translate(-20.5, -44)translate(1, 1)" stroke="#000000" stroke-width="2">\n' +
      `            <path d="M16.5,40.1335443 L31.6080922,85 L1.39190779,85 L16.5,40.1335443 Z" id="三角形" fill="$color"></path>
` +
      '            <line x1="16.5" y1="0.5" x2="16.5" y2="41.5" id="直线" stroke-linecap="square"></line>\n' +
      '            <line x1="16.5" y1="0.5" x2="38.5" y2="0.5" id="直线-2" stroke-linecap="square"></line>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
  {
    name: `${NAME}-$color-left-active`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="41px" height="87px" viewBox="0 0 41 87" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_left_select</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_left_select" transform="translate(20.75, 43.75) scale(-1, 1) translate(-20.75, -43.75)translate(1, 0.5)" stroke="#FF0000" stroke-width="2">\n' +
      '            <path d="M16.5,40.6335443 L31.6080922,85.5 L1.39190779,85.5 L16.5,40.6335443 Z" id="三角形" fill="$color"></path>\n' +
      '            <line x1="16.5" y1="1" x2="16.5" y2="42" id="直线" stroke-linecap="square"></line>\n' +
      '            <line x1="17" y1="0.5" x2="39" y2="0.5" id="直线-2" stroke-linecap="square"></line>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
  {
    name: `${NAME}-$color-right`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="40px" height="87px" viewBox="0 0 40 87" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_right</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_right" transform="translate(0, 1)" stroke="#000000" stroke-width="2">\n' +
      '            <path d="M16.5,40.1335443 L31.6080922,85 L1.39190779,85 L16.5,40.1335443 Z" id="三角形" fill="$color"></path>\n' +
      '            <line x1="16.5" y1="0.5" x2="16.5" y2="41.5" id="直线" stroke-linecap="square"></line>\n' +
      '            <line x1="16.5" y1="0.5" x2="38.5" y2="0.5" id="直线-2" stroke-linecap="square"></line>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
  {
    name: `${NAME}-$color-right-active`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="40px" height="87px" viewBox="0 0 40 87" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_right_select</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_right_select" transform="translate(0, 0.5)" stroke="#FF0000" stroke-width="2">\n' +
      '            <path d="M16.5,40.6335443 L31.6080922,85.5 L1.39190779,85.5 L16.5,40.6335443 Z" id="三角形" fill="$color"></path>\n' +
      '            <line x1="16.5" y1="1" x2="16.5" y2="42" id="直线" stroke-linecap="square"></line>\n' +
      '            <line x1="17" y1="0.5" x2="39" y2="0.5" id="直线-2" stroke-linecap="square"></line>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
]

export enum UPDATE_STATUS {
  ONLINE = 'Online',
  DELAY = 'Delay',
  OFFLINE = 'Offline',
}
