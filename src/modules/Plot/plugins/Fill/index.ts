import { bbox, booleanPointInPolygon, centerOfMass, lineToPolygon } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Feature, Polygon } from 'geojson'
import type { Map } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'
import polylabel from 'polylabel'

import { FillResidentEvent } from '@/modules/Plot/plugins/Events/FillEvents.ts'
import { FillUpdateEvent } from '@/modules/Plot/plugins/Events/FillEvents.ts'
import { FillCreateEvent } from '@/modules/Plot/plugins/Events/FillEvents.ts'
import { IconPoint } from '@/modules/Plot/plugins/IconPoint'
import { Line } from '@/modules/Plot/plugins/Line'
import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { IFillOptions } from '@/types/Plot/Fill.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { CirclePointStyle } from '@/types/Plot/Point.ts'

import { DEFAULT_FILL_COLOR, FILL_LAYER_NAME, LAYER_LIST, NAME } from './vars.ts'

export class Fill<T extends IFillOptions = IFillOptions> extends Poi<T, GeoJSON.Polygon | null> {
  static NAME: PlotType = NAME
  override readonly LAYER: string = FILL_LAYER_NAME
  private removed = false
  private cachedCenterKey = ''
  private cachedCenter: LngLat | null = null

  public title: IconPoint | null = null
  public line: Line | null = null

  protected residentEvent: FillResidentEvent
  protected updateEvent: FillUpdateEvent
  protected createEvent: FillCreateEvent

  constructor(map: Map, options: T) {
    super(map, options)

    this.options.position = this.normalizePositions(this.options.position)

    this.residentEvent = new FillResidentEvent(map, this)
    this.updateEvent = new FillUpdateEvent(map, this)
    this.createEvent = new FillCreateEvent(map, this)

    this.createLine()

    this.syncTitle()
    this.residentEvent.enabled()
  }

  get center(): LngLat | null {
    if (!Array.isArray(this.options.position) || this.options.position.length === 0) {
      return null
    }

    const feature = this.getFeature()
    if (!feature.geometry) return null
    const polygon = feature as Feature<Polygon>
    const key = JSON.stringify(polygon.geometry.coordinates)
    if (key === this.cachedCenterKey && this.cachedCenter) {
      return new LngLat(this.cachedCenter.lng, this.cachedCenter.lat)
    }
    const center = centerOfMass(polygon)
    const coordinates = booleanPointInPolygon(center, polygon)
      ? center.geometry.coordinates
      : polylabel(polygon.geometry.coordinates, 0.000001)
    this.cachedCenterKey = key
    this.cachedCenter = new LngLat(coordinates[0], coordinates[1])
    return new LngLat(this.cachedCenter.lng, this.cachedCenter.lat)
  }

  get geometry(): Polygon | null {
    return this.getFeature().geometry
  }

  getFeature(): Feature<Polygon | null> {
    const outline = this.line?.getFeature()
    if (
      outline?.geometry &&
      new Set(outline.geometry.coordinates.map((coordinate) => coordinate.join(','))).size >= 3
    ) {
      const polygon = lineToPolygon(outline as Feature<GeoJSON.LineString>, {
        properties: {
          ...this.options.style,
          ...this.options.properties,
          visibility: this.options.visibility,
          id: this.options.id,
        },
      }) as Feature<Polygon | null>
      polygon.id = this.id
      return polygon
    } else {
      return {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }
    }
  }

  public override get id(): string {
    return this.options.id
  }

  move(position: LngLat): void {
    // 1. 确保有拖拽参考点和内部关联的 line 对象 如果不借助鼠标拖拽 直接移动以中心为基准点
    const drag: LngLat | null = this.updateEvent.getDragLngLat() ?? this.center
    if (!this.line || !drag) return

    // 2. 计算当前鼠标所在的帧，相对于上一帧鼠标位置的经纬度偏移量 (Delta)
    const lngDiff = position.lng - drag.lng
    const latDiff = position.lat - drag.lat

    // 3. 借助底层 Line 实例，遍历并移动所有构成多边形的实点
    this.line.points.forEach((point, index) => {
      if (point.center) {
        const newPos = new LngLat(point.center.lng + lngDiff, point.center.lat + latDiff)

        // 🔥 核心思路：复用 Line 的 updatePoint
        // 传入 false 是为了防止在 for 循环中疯狂触发重绘，造成严重的性能问题
        this.line!.updatePoint(index, newPos, false)
      }
    })

    // 4. 同步最新坐标给 Fill 自身
    // (因为 line.updatePoint 内部已经更新了 line.options.position)
    this.options.position = this.line.options.position

    // 5. 触发真正的统一重绘
    this.render()
  }

  private normalizePositions(positions: T['position']): T['position'] {
    if (!positions) return undefined
    if (!positions.length) return []
    const result = positions.map((position) => {
      // Validate runtime input as well as the public TypeScript contract.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!position || !Number.isFinite(position.lng) || !Number.isFinite(position.lat)) {
        throw new Error('Invalid polygon coordinate')
      }
      return new LngLat(position.lng, position.lat)
    })
    const first = result[0]
    while (
      result.length > 1 &&
      result.at(-1)!.lng === first.lng &&
      result.at(-1)!.lat === first.lat
    )
      result.pop()
    if (result.length >= 3) result.push(new LngLat(first.lng, first.lat))
    return result
  }

  private syncTitle(): void {
    const center = this.center
    if (!center) {
      this.title?.remove()
      this.title = null
      return
    }
    const options = {
      id: this.id + '-fill-title-icon',
      icon: this.options.icon ?? 'normal-fill',
      position: center,
      visibility: this.options.visibility,
      name: this.options.name,
      isName: this.options.isName,
    }
    if (this.title) this.title.update(options)
    else {
      this.title = new IconPoint(this.context.map, options)
      this.title.render()
    }
  }

  public createLine(): void {
    if (!Array.isArray(this.options.position)) return

    // 1. 提取 Fill 的颜色，如果没有设置则使用默认的主题色 #f00
    const fillColor = this.options.style?.['fill-color'] ?? DEFAULT_FILL_COLOR

    // 2. 组装边框线样式：颜色与 Fill 同步，并合并传入的 outLineStyle
    const lineStyle: IFillOptions['outLineStyle'] = {
      'line-color': fillColor,
      ...this.options.outLineStyle,
    }

    // 3. 组装实点样式：边框颜色与 Fill 同步，并合并传入的 vertexStyle
    const vertexStyle = {
      'circle-radius': 5,
      'circle-stroke-color': fillColor,
      // 'circle-color': '#fff', // 内部默认是白色，如果需要全实心也可以改成 fillColor
      ...this.options.vertexStyle,
    } as CirclePointStyle

    this.line = new Line(this.context.map, {
      isName: false,
      // midStyle: undefined,
      // name: '',
      position: this.options.position,
      properties: {},
      style: lineStyle,
      vertexStyle: vertexStyle,
      visibility: this.options.visibility,
      id: `${this.id}-line`,
    })

    const lastIndex = this.line.points.length - 1
    if (lastIndex > 0) {
      const lastPoint = this.line.points[lastIndex]
      lastPoint.hide()
    }
  }

  public removeLine(): void {
    this.line?.remove()
    this.line = null
  }

  override onAdd(): void {
    this.context.register.addSource(PLOT_SOURCE_NAME, EMPTY_SOURCE)

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })

    this.context.iconManage.addSvg({
      name: 'normal-fill',
      svg: '<svg t="1773066297467" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="15103" width="32" height="32"><path d="M1024 512c0 282.8-229.2 512-512 512S0 794.8 0 512 229.2 0 512 0s512 229.2 512 512" fill="#5A89FF" p-id="15104"></path><path d="M709.76 818.4H314.24a24 24 0 0 1-22.8-16.56L169.2 425.6c-3.2-9.92 0.32-20.72 8.72-26.8l320-232.48c8.4-6.08 19.84-6.08 28.24 0l320 232.48a24 24 0 0 1 8.72 26.8l-122.24 376.16a24.136 24.136 0 0 1-22.88 16.64z m-378.08-48h360.64l111.44-343.04L512 215.36l-291.76 212L331.68 770.4z" fill="#FFFFFF" p-id="15105"></path></svg>',
    })
  }

  override onRemove(): void {
    this.remove()
  }

  remove(): void {
    if (this.removed) return
    this.createEvent.destroy()
    this.updateEvent.destroy()
    this.residentEvent.destroy()
    this.detachLifecycle()
    this.removeAllListeners()
    this.context.focus.remove(this.id)
    this.context.map.removeFeatureState({ source: this.SOURCE, id: this.id })
    this.options.position = []
    this.removeLine()

    this.title?.remove()
    this.title = null
    this.render()
    this.removed = true
  }

  public override show(): void {
    this.line?.show()
    this.line?.points.at(-1)?.hide()
    super.show()
    if (this.isEdit) this.edit()
  }

  public override hide(): void {
    this.stop()
    this.updateEvent.disabled()
    this.residentEvent.disabled()
    this.line?.hide()
    super.hide()
  }

  render(): void {
    if (this.removed) return
    if (this.line) {
      this.line.render()
      this.options.position = this.line.options.position
    }

    this.syncTitle()

    if (this.isFocus && this.geometry && this.visibility === 'visible') {
      this.context.focus.set(this.getFeature() as GeoJSON.Feature, {
        armLength: 40,
        padding: 30,
      })
    } else {
      this.context.focus.remove(this.id)
    }

    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, this.getFeature() as GeoJSON.Feature)
  }

  start(): void {
    if (this.center === null) {
      this.createEvent.enabled()
      this.updateEvent.disabled()
      this.residentEvent.disabled()

      this.setState({ create: true })
    }
  }

  stop(): void {
    this.createEvent.disabled()
    this.residentEvent.enabled()
    this.setState({ create: false })
    this.render()
  }

  unedit(): void {
    this.setState({ edit: false })
    this.line?.unedit()
    this.residentEvent.enabled()
    this.updateEvent.disabled()

    this.render()
  }

  edit(): void {
    if (this.removed) return
    this.setState({ edit: true })
    if (this.visibility !== 'visible') return

    this.line?.edit()

    this.residentEvent.disabled()
    this.updateEvent.enabled()
    this.render()
  }

  focus(): void {
    this.setState({ focus: true })

    this.render()
  }

  unfocus(): void {
    this.setState({ focus: false })

    this.render()
  }

  select(): void {
    if (!this.geometry) return
    const bounds = bbox(this.getFeature() as GeoJSON.Feature) as [number, number, number, number]
    this.context.map.fitBounds(bounds, {
      padding: {
        left: 60,
        right: 60,
        top: 60,
        bottom: 60,
      },
    })

    this.focus()
  }

  unselect(): void {
    this.unfocus()
  }

  update(options: T): void {
    if (options.id !== this.id) throw new Error('Plot id cannot be changed')
    this.updateEvent.disabled()
    this.options = options

    this.options.position = this.normalizePositions(this.options.position)

    this.removeLine()
    this.createLine()
    if (this.isEdit) this.edit()
    else this.render()
  }
}
