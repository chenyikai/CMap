import { lineString } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'
import { Marker, Point } from 'mapbox-gl'
import type { BBox } from 'rbush'

import { Module } from '@/core/Module'
import type { AllAnchor, ITooltipOptions, SimpleAnchor } from '@/types/Toolip'

import { CONNECT_LINE_LAYER, TOOLTIP_SOURCE_NAME } from './vars.ts'

export class Tooltip extends Module {
  options: ITooltipOptions

  private visible = false

  private mark: Marker | null = null

  private zoom = (): void => {
    this.render()
  }

  constructor(map: Map, options: ITooltipOptions) {
    super(map)
    this.options = options
    this.visible = !!options.visible

    this._create()
  }

  get id(): string | number {
    return this.options.id
  }

  override onAdd(): void {
    this.context.register.addSource(TOOLTIP_SOURCE_NAME, {
      type: 'geojson',
      dynamic: true,
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    this.context.register.addLayer(CONNECT_LINE_LAYER)
  }

  override onRemove(): void {
    if (this.mark) {
      this.mark.remove()
      this.mark = null
    }
  }

  hide(): void {
    this.visible = false
    this.render()
    this.context.map.off('zoom', this.zoom)
    this.context.map.off('zoomend', this.zoom)
  }

  show(): void {
    this.visible = true
    this.render()
    this.context.map.on('zoom', this.zoom)
    this.context.map.on('zoomend', this.zoom)
  }

  setAnchor(anchor: ITooltipOptions['anchor']): void {
    if (this.mark) {
      this.mark.remove()
      this.mark = null
    }
    this.context.map.off('zoom', this.zoom)
    this.context.map.off('zoomend', this.zoom)

    this.options.anchor = anchor
    this._create()

    this.render()
  }

  getSimpleBbox(): SimpleAnchor {
    return {
      'top-left': this.getBbox('top-left'),
      'top-right': this.getBbox('top-right'),
      'bottom-left': this.getBbox('bottom-left'),
      'bottom-right': this.getBbox('bottom-right'),
    }
  }

  getAllBbox(): AllAnchor {
    return {
      center: this.getBbox('center'),
      top: this.getBbox('top'),
      bottom: this.getBbox('bottom'),
      left: this.getBbox('left'),
      right: this.getBbox('right'),
      'top-left': this.getBbox('top-left'),
      'top-right': this.getBbox('top-right'),
      'bottom-left': this.getBbox('bottom-left'),
      'bottom-right': this.getBbox('bottom-right'),
    }
  }

  getBbox(val?: ITooltipOptions['anchor']): BBox {
    if (this.mark === null) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
      }
    }

    const anchor = val ?? this.options.anchor

    const point = this.context.map.project(this.mark.getLngLat())
    // const offset = this.mark.getOffset() || new Point(0, 0)
    const offset = this.mark.getOffset()
    const { offsetWidth, offsetHeight } = this.mark.getElement()

    const bbox: BBox = {
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y,
    }

    if (anchor === 'top') {
      bbox.minX = point.x - offsetWidth / 2
      bbox.maxX = point.x + offsetWidth / 2
      bbox.maxY = point.y + offsetHeight + Math.abs(offset.y)
    } else if (anchor === 'bottom') {
      bbox.minX = point.x - offsetWidth / 2
      bbox.maxX = point.x + offsetWidth / 2
      bbox.minY = point.y - offsetHeight + offset.y
    } else if (anchor === 'left') {
      bbox.maxY = point.y + offsetHeight / 2
      bbox.minY = point.y - offsetHeight / 2
      bbox.maxX = point.x + offsetWidth + Math.abs(offset.x)
    } else if (anchor === 'right') {
      bbox.maxY = point.y + offsetHeight / 2
      bbox.minY = point.y - offsetHeight / 2
      bbox.minX = point.x - offsetWidth + offset.x
    } else if (anchor === 'center') {
      bbox.maxY = point.y + offsetHeight / 2
      bbox.minY = point.y - offsetHeight / 2
      bbox.maxX = point.x + offsetWidth / 2
      bbox.minX = point.x - offsetWidth / 2
    } else if (anchor === 'top-left') {
      bbox.maxY = point.y + offsetHeight + Math.abs(offset.y)
      bbox.maxX = point.x + offsetWidth + Math.abs(offset.x)
    } else if (anchor === 'top-right') {
      bbox.maxY = point.y + offsetHeight + Math.abs(offset.y)
      bbox.minX = point.x - offsetWidth + offset.x
    } else if (anchor === 'bottom-left') {
      bbox.minY = point.y - offsetHeight + offset.y
      bbox.maxX = point.x + offsetWidth + Math.abs(offset.x)
    } else if (anchor === 'bottom-right') {
      bbox.minY = point.y - offsetHeight + offset.y
      bbox.minX = point.x - offsetWidth + offset.x
    }

    return bbox
  }

  remove(): void {
    if (this.mark) {
      this.mark.remove()
      this.mark = null
    }

    this.visible = false
    this.connectLine()
    this.context.map.off('zoom', this.zoom)
    this.context.map.off('zoomend', this.zoom)
  }

  _create(): void {
    this.mark = new Marker({
      className: this.options.className ?? 'mapbox-gl-tooltip',
      element: this.options.element,
      offset: this._getOffsetByAnchor(),
      anchor: this.options.anchor,
    }).setLngLat(this.options.position)

    if (this.visible) {
      this.render()
      this.context.map.on('zoom', this.zoom)
      this.context.map.on('zoomend', this.zoom)
    }
  }

  _getOffsetByAnchor(): Point {
    const offset = new Point(0, 0)
    if (this.options.anchor === 'center') {
      offset.x = 0
      offset.y = 0
    } else if (this.options.anchor === 'top') {
      offset.x = 0
      offset.y = this.options.offsetY ?? 0
    } else if (this.options.anchor === 'bottom') {
      offset.x = 0
      offset.y = -(this.options.offsetY ?? 0)
    } else if (this.options.anchor === 'left') {
      offset.x = this.options.offsetX ?? 0
      offset.y = 0
    } else if (this.options.anchor === 'right') {
      offset.x = -(this.options.offsetX ?? 0)
      offset.y = 0
    } else if (this.options.anchor === 'top-left') {
      offset.x = this.options.offsetX ?? 0
      offset.y = this.options.offsetY ?? 0
    } else if (this.options.anchor === 'top-right') {
      offset.x = -(this.options.offsetX ?? 0)
      offset.y = this.options.offsetY ?? 0
    } else if (this.options.anchor === 'bottom-left') {
      offset.x = this.options.offsetX ?? 0
      offset.y = -(this.options.offsetY ?? 0)
    } else if (this.options.anchor === 'bottom-right') {
      offset.x = -(this.options.offsetX ?? 0)
      offset.y = -(this.options.offsetY ?? 0)
    }

    return offset
  }

  setLngLat(lngLat: LngLat): this {
    this.options.position = lngLat

    if (this.mark) {
      this.mark.setLngLat(lngLat)
    }

    return this
  }

  connectLine(): void {
    const id = `${String(this.options.id)}-tooltip-connect-line`

    const endPoint = this.connectPoint()
    if (!endPoint || !this.visible) {
      const emptyFeature: GeoJSON.Feature<GeoJSON.Point> = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        id,
        properties: {},
      }

      this.context.register.setGeoJSONData(TOOLTIP_SOURCE_NAME, emptyFeature)
      return
    }

    const lonLat = [this.options.position.toArray(), endPoint.toArray()]

    const feature: GeoJSON.Feature<GeoJSON.LineString> = lineString(
      lonLat,
      {},
      {
        id,
      },
    )

    this.context.register.setGeoJSONData(TOOLTIP_SOURCE_NAME, feature)
  }

  connectPoint(): LngLat | null {
    if (!this.mark || !this.visible) return null

    const point = this.context.map.project(this.mark.getLngLat())
    const offset = this.mark.getOffset()

    point.x += offset.x
    point.y += offset.y

    if (this.options.anchor === 'top-left') {
      point.x += this.mark.getElement().offsetWidth / 2
    } else if (this.options.anchor === 'top-right') {
      point.x -= this.mark.getElement().offsetWidth / 2
    } else if (this.options.anchor === 'bottom-left') {
      point.x += this.mark.getElement().offsetWidth / 2
    } else if (this.options.anchor === 'bottom-right') {
      point.x -= this.mark.getElement().offsetWidth / 2
    }

    return this.context.map.unproject(point)
  }

  render(): this {
    if (!this.mark) {
      console.warn(this, 'tooltip尚未初始化')
      return this
    }

    if (this.visible) {
      this.mark.addTo(this.context.map)
    } else {
      this.mark.remove()
    }

    this.connectLine()
    return this
  }
}
