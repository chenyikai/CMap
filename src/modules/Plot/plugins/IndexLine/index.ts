import type { Map } from 'mapbox-gl'
import type { LngLat } from 'mapbox-gl'

import { IndexPoint } from '@/modules/Plot/plugins/IndexPoint'
import { Line } from '@/modules/Plot/plugins/Line'
import type { IIndexLineOptions } from '@/types/Plot/IndexLine.ts'
import type { IndexPointStyle } from '@/types/Plot/IndexPoint.ts'
import { PointType } from '@/types/Plot/Line.ts'
import type { PointInstance } from '@/types/Plot/Point.ts'

export class IndexLine extends Line {
  constructor(map: Map, options: IIndexLineOptions) {
    super(map, options)
  }

  public override createVertex(id: string, index: number, position: LngLat): PointInstance {
    return new IndexPoint(this.context.map, {
      id, // 建议 ID 加上 node 标识
      isName: false,
      visibility: 'visible',
      position,
      index: index + 1,
      style: this.options.vertexStyle as IndexPointStyle,
      properties: {
        id: `${this.id}-node-${String(index)}`,
        index,
        type: PointType.VERTEX, // 标记类型，方便点击事件区分
      },
    })
  }
}
