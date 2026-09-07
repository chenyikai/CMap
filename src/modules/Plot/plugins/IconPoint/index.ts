import { point } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Map } from 'mapbox-gl'

import { Point } from '@/modules/Plot/plugins/Point'
import type { IIconPointOptions } from '@/types/Plot/IconPoint.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'

import {
  DEFAULT_ICON_ANCHOR,
  DEFAULT_ICON_SIZE,
  DEFAULT_TEXT_SIZE,
  GAP_PX,
  LAYER_LIST,
  NAME,
  POINT_ICON_LAYER_NAME,
} from './vars.ts'

export class IconPoint extends Point<IIconPointOptions> {
  static override NAME: PlotType = NAME

  override readonly LAYER: string = POINT_ICON_LAYER_NAME

  constructor(map: Map, options: IIconPointOptions) {
    super(map, options)

    this.residentEvent.enabled()
  }

  public override onAdd(): void {
    super.onAdd()

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })
  }

  public override getFeature(): GeoJSON.Feature<GeoJSON.Point | null> {
    if (!this.options.position) {
      return {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }
    }

    const h = this.context.iconManage.getImage(this.options.icon)?.height ?? 0
    const scale = this.options.style?.['icon-size'] ?? DEFAULT_ICON_SIZE
    const anchor = this.options.style?.['icon-anchor'] ?? DEFAULT_ICON_ANCHOR
    const tSize = this.options.style?.['text-size'] ?? DEFAULT_TEXT_SIZE

    const calculatedOffset = this.calculateTextOffset({
      iconHeight: h,
      iconScale: scale,
      iconAnchor: anchor,
      textSize: tSize,
      gap: GAP_PX,
    })

    return point(
      this.options.position.toArray(),
      {
        ...this.options.style,
        ...this.options.properties,
        id: this.options.id,
        icon: this.options.icon,
        text: this.options.name,
        visibility: this.options.visibility,
        isName: this.options.isName,
        _calcTextOffset: calculatedOffset,
        meta: 'icon',
      },
      {
        id: this.options.id,
      },
    )
  }
}
