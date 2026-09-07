import { bearing } from '@turf/turf'
import type { LngLat, Map } from 'mapbox-gl'

import { IconPoint } from '@/modules/Plot/plugins/IconPoint'
import { Line } from '@/modules/Plot/plugins/Line'
import { EventStatus } from '@/types/EventState'
import type { IArrowLineOptions } from '@/types/Plot/ArrowLine.ts'
import { PointType } from '@/types/Plot/Line.ts'
import type { PointInstance } from '@/types/Plot/Point.ts'

export class ArrowLine extends Line<IArrowLineOptions> {
  constructor(map: Map, options: IArrowLineOptions) {
    super(map, options)
  }

  public override onAdd(): void {
    super.onAdd()

    this.context.iconManage.loadSvg([
      {
        name: 'plot-arrow-start',
        svg: '<svg t="1772517328676" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="41296" width="32" height="32"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#39BF8F" p-id="41297"></path><path d="M803.84 558.08c-5.12 53.76-12.8 89.6-23.04 104.96-10.24 15.36-30.72 25.6-61.44 25.6h-117.76c-38.4 0-56.32-20.48-56.32-56.32v-217.6h181.76v-128h-192V240.64h238.08V460.8h-179.2v153.6c0 17.92 10.24 28.16 28.16 28.16h89.6c17.92 0 30.72-7.68 38.4-20.48 5.12-12.8 7.68-38.4 10.24-76.8l43.52 12.8z m-545.28-43.52l43.52 5.12c-2.56 38.4-5.12 74.24-10.24 107.52 20.48 38.4 43.52 64 69.12 84.48v-240.64H225.28v-43.52h122.88v-97.28H238.08v-43.52h110.08V197.12h48.64v89.6h107.52v43.52h-107.52v97.28H512v43.52h-102.4v94.72h94.72v43.52H409.6v125.44c40.96 10.24 122.88 17.92 245.76 17.92 74.24 0 128-2.56 163.84-2.56l-7.68 46.08H665.6c-156.16 0-253.44-10.24-291.84-28.16-33.28-15.36-64-43.52-89.6-84.48-10.24 43.52-23.04 87.04-40.96 125.44L204.8 775.68c33.28-76.8 51.2-163.84 53.76-261.12z" fill="#FFFFFF" p-id="41298"></path></svg>',
      },
      {
        name: 'plot-arrow',
        svg: '<svg t="1772517045368" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="35873" width="32" height="32"><path d="M859.615 662.634c0 15.79300001-6.25500001 30.502-17.606 41.418-22.813 21.967-59.274 21.291-81.271-1.512l-250.406-259.796L263.652 703.5c-21.796 23.016-58.255 24.034-81.29 2.268-11.425-10.837-17.975-26.076-17.975-41.799 0-14.747 5.576-28.771 15.709-39.492L467.923 320.166c16.939-17.94 43.603-22.701 66.333-11.842 1.705 0.781 3.015 1.69300001 3.761 2.231a65.89 65.89 0 0 0 1.399 0.748c2.742 1.45 6.385 3.373 9.855 6.687l0.225 0.218c0.209 0.203 0.397 0.404 0.573 0.59a19.821 19.821 0 0 1 2.609 2.17500001L843.521 622.732c10.382 10.795 16.096 24.962 16.09600001 39.901z" p-id="35874" fill="#ff0000"></path></svg>',
      },
      {
        name: 'plot-arrow-end',
        svg: '<svg t="1772517393676" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="42489" width="32" height="32"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#FF343E" p-id="42490"></path><path d="M393.216 277.9136a901.12 901.12 0 0 1-75.9808 155.8528c18.0224-2.2528 36.2496-4.9152 54.272-8.192l31.5392-67.7888 45.056 16.7936a1425.8176 1425.8176 0 0 1-108.544 196.608 634.88 634.88 0 0 0 80.2816-26.624v46.2848a689.3568 689.3568 0 0 1-139.4688 37.888L266.24 582.0416a89.4976 89.4976 0 0 0 22.9376-14.5408A568.7296 568.7296 0 0 0 348.16 472.2688l-78.848 12.0832-12.4928-46.6944a44.8512 44.8512 0 0 0 20.48-19.0464 1016.832 1016.832 0 0 0 66.7648-159.3344z m49.5616 421.0688a1099.776 1099.776 0 0 1-171.8272 46.08l-7.5776-54.272a956.8256 956.8256 0 0 0 179.4048-44.6464z m143.36-432.5376a437.4528 437.4528 0 0 1-14.1312 43.4176h149.504v40.96a466.1248 466.1248 0 0 1-78.2336 111.4112 681.5744 681.5744 0 0 0 122.88 64.1024L739.328 573.44a680.5504 680.5504 0 0 1-132.5056-77.0048 490.2912 490.2912 0 0 1-153.1904 84.1728l-25.6-45.2608a426.5984 426.5984 0 0 0 139.0592-71.0656 696.32 696.32 0 0 1-53.6576-53.248 518.7584 518.7584 0 0 1-40.96 40.96L440.5248 409.6a305.3568 305.3568 0 0 0 93.3888-150.528z m-97.6896 372.736a1465.7536 1465.7536 0 0 1 237.9776 81.92l-27.2384 43.008a1431.3472 1431.3472 0 0 0-240.2304-81.92zM554.1888 552.96a921.6 921.6 0 0 1 151.9616 57.1392l-25.3952 39.1168a904.8064 904.8064 0 0 0-153.8048-56.5248z m108.1344-192.7168h-113.664c-2.048 3.2768-5.12 7.9872-8.6016 14.5408a474.112 474.112 0 0 0 62.464 59.1872 447.0784 447.0784 0 0 0 59.8016-74.5472z" fill="#FFFFFF" p-id="42491"></path></svg>',
      },
    ])
  }

  public override createVertex(id: string, index: number, position: LngLat): PointInstance {
    return new IconPoint(this.context.map, {
      icon: index === 0 ? 'plot-arrow-start' : this.getIconName(index),
      id,
      isName: false,
      position,
      properties: {
        id,
        index,
        type: PointType.VERTEX,
      },
      style: {
        ...this.options.vertexStyle,
        'icon-anchor': 'center',
        'icon-rotate': this.getRotate(index),
      },
      visibility: this.options.visibility,
    })
  }

  public override render(): void {
    this.points.forEach((point, index) => {
      const icon = point as IconPoint
      icon.options.icon = this.getIconName(index)
      icon.options.style = { ...icon.options.style, 'icon-rotate': this.getRotate(index) }
    })
    super.render()
  }

  private getIconName(index: number): string {
    if (!Array.isArray(this.options.position)) return ''

    if (this.createEvent.status === EventStatus.ON) return 'plot-arrow'

    const isLast = this.options.position.length - 1 === index
    const isFirst = index === 0

    if (isFirst) {
      return 'plot-arrow-start'
    } else if (isLast) {
      return 'plot-arrow-end'
    } else {
      return 'plot-arrow'
    }
  }

  private getRotate(index: number): number {
    if (!Array.isArray(this.options.position)) return 0

    if (this.createEvent.status === EventStatus.ON) {
      if (index === 0) return 0

      const last = this.options.position[index - 1]
      const current = this.options.position[index]
      return bearing(last.toArray(), current.toArray())
    }

    const isLast = this.options.position.length - 1 === index
    const isFirst = index === 0
    if (isFirst || isLast) return 0

    const last = this.options.position[index - 1]
    const current = this.options.position[index]
    return bearing(last.toArray(), current.toArray())
  }
}
