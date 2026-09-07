import { point } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Map } from 'mapbox-gl'

import { Point } from '@/modules/Plot/plugins/Point'
import type { IIndexPointOptions } from '@/types/Plot/IndexPoint.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'

import { LAYER_LIST, NAME, POINT_INDEX_LAYER_NAME } from './vars.ts'

export class IndexPoint extends Point<IIndexPointOptions> {
  static override NAME: PlotType = NAME
  override readonly LAYER: string = POINT_INDEX_LAYER_NAME

  constructor(map: Map, options: IIndexPointOptions) {
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
      const emptyFeature: GeoJSON.Feature<null> = {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }

      return emptyFeature
    }

    return point(
      this.options.position.toArray(),
      {
        ...this.options.style,
        ...this.options.properties,
        id: this.options.id,
        visibility: this.options.visibility,
        isName: false,
        index: this.options.index,
        meta: 'circle',
        subMeta: 'indexPoint',
      },
      {
        id: this.options.id,
      },
    )
  }
}
