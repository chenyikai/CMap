import { along, bbox, length, lineString } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Feature, LineString } from 'geojson'
import type { Map } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import {
  LineCreateEvent,
  LineResidentEvent,
  LineUpdateEvent,
} from '@/modules/Plot/plugins/Events/LineEvents.ts'
import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import { Point } from '@/modules/Plot/plugins/Point'
import { EMPTY_SOURCE, Meta, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { ILineOptions } from '@/types/Plot/Line.ts'
import { PointType } from '@/types/Plot/Line.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { PointInstance, PointStyle } from '@/types/Plot/Point.ts'

import { DEFAULT_LINE_COLOR, LAYER_LIST, LINE_LAYER_NAME, NAME } from './vars.ts'

export class Line<T extends ILineOptions = ILineOptions> extends Poi<T, GeoJSON.LineString | null> {
  static NAME: PlotType = NAME
  override readonly LAYER: string = LINE_LAYER_NAME

  private nodeSequence = 0
  private midSequence = 0
  private removed = false

  public points: PointInstance[] = []
  public midPoints: Point[] = []
  public titles: GeoJSON.Feature<GeoJSON.LineString | null>[] = []

  public residentEvent: LineResidentEvent
  public updateEvent: LineUpdateEvent
  public createEvent: LineCreateEvent

  constructor(map: Map, options: T) {
    super(map, options)

    this.residentEvent = new LineResidentEvent(map, this)
    this.updateEvent = new LineUpdateEvent(map, this)
    this.createEvent = new LineCreateEvent(map, this)
    this.createPoint()

    this.residentEvent.enabled()
  }

  public override get id(): string {
    return this.options.id
  }

  public override get center(): LngLat | null {
    if (!Array.isArray(this.options.position) || this.options.position.length < 2) {
      return null
    }

    const feature = this.getFeature() as GeoJSON.Feature<GeoJSON.LineString>
    const distance = length(feature)
    const coordinates = along(feature, distance / 2).geometry.coordinates

    return new LngLat(coordinates[0], coordinates[1])
  }

  public override get geometry(): GeoJSON.LineString | null {
    return this.getFeature().geometry
  }

  public override onAdd(): void {
    this.context.register.addSource(PLOT_SOURCE_NAME, EMPTY_SOURCE)

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })
  }
  public override onRemove(): void {
    this.remove()
  }

  public override getFeature(): GeoJSON.Feature<GeoJSON.LineString | null> {
    if (
      (!this.options.position || this.options.position.length < 2) &&
      !this.createEvent.getDrawLngLat()
    ) {
      return {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }
    }

    const coordinates = (this.options.position ?? []).map((position) => position.toArray())

    const modify = this.updateEvent.getModifyLngLat()

    if (modify) {
      const { index } = modify.options.properties ?? {}
      if (typeof index === 'number' && modify.center) {
        coordinates.splice(index + 1, 0, modify.center.toArray())
      }
    }

    if (this.createEvent.getDrawLngLat()) {
      coordinates.push(this.createEvent.getDrawLngLat()!.toArray())
    }

    if (coordinates.length < 2) {
      return { type: 'Feature', id: this.id, geometry: null, properties: {} }
    }

    return lineString(
      coordinates,
      {
        ...this.options.properties,
        ...this.options.style,
        visibility: this.options.visibility,
        isName: this.options.isName,
        text: this.options.name,
        id: this.options.id,
      },
      {
        id: this.id,
      },
    )
  }
  public override start(): void {
    if (this.center === null) {
      this.createEvent.enabled()
      this.updateEvent.disabled()
      this.residentEvent.disabled()
      this.setState({ create: true })
    }
  }
  public override stop(): void {
    this.createEvent.disabled()
    this.residentEvent.enabled()
    this.setState({ create: false })
    this.render()
  }

  public override show(): void {
    if (this.removed) return
    this.options.visibility = 'visible'
    this.points.forEach((point) => {
      point.show()
    })
    this.midPoints.forEach((mid) => {
      if (this.isEdit) mid.show()
      else mid.hide()
    })

    this.restoreInteraction()
    this.render()
  }

  public override hide(): void {
    this.stop()
    this.updateEvent.disabled()
    this.residentEvent.disabled()
    this.points.forEach((point) => {
      point.hide()
    })
    this.midPoints.forEach((mid) => {
      mid.hide()
    })

    super.hide()
  }

  public override edit(): void {
    if (this.removed) return
    this.setState({ edit: true })
    if (this.visibility !== 'visible') return

    this.points.forEach((point) => {
      point.edit()
    })

    this.midPoints.forEach((midPoint) => {
      midPoint.edit()
      midPoint.show()
    })

    this.residentEvent.disabled()
    this.updateEvent.enabled()

    this.render()
  }

  public override unedit(): void {
    this.setState({ edit: false })
    this.points.forEach((point) => {
      point.unedit()
    })
    this.midPoints.forEach((midPoint) => {
      midPoint.unedit()
      midPoint.hide()
    })

    this.residentEvent.enabled()
    this.updateEvent.disabled()

    this.render()
  }

  public override focus(): void {
    this.setState({ focus: true })
    this.render()
  }
  public override unfocus(): void {
    this.setState({ focus: false })
    this.render()
  }
  public override select(): void {
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
  public override unselect(): void {
    this.unfocus()
  }
  public override move(position: LngLat): void {
    // 如果不借助鼠标拖拽 直接移动以中心为基准点
    const drag: LngLat | null = this.updateEvent.getDragLngLat() ?? this.center

    if (!drag) return

    const lngDiff = position.lng - drag.lng
    const latDiff = position.lat - drag.lat
    this.points.forEach((point, index) => {
      if (point.center) {
        const newPos = new LngLat(point.center.lng + lngDiff, point.center.lat + latDiff)

        this.updatePoint(index, newPos, false)
      }
    })

    this.render()
  }
  public override update(options: T): void {
    if (options.id !== this.id) throw new Error('Plot id cannot be changed')
    this.options = options
    this.createPoint()

    this.render()
  }
  public override remove(): void {
    if (this.removed) return
    this.residentEvent.destroy()
    this.createEvent.destroy()
    this.updateEvent.destroy()
    this.removePoint()
    this.removed = true
    this.detachLifecycle()
    this.context.focus.remove(this.id)
    this.context.map.removeFeatureState({ source: this.SOURCE, id: this.id })
    this.removeAllListeners()

    this.options.position = []
    this.context.register.setGeoJSONData(this.SOURCE, {
      type: 'Feature',
      id: this.id,
      geometry: null,
      properties: {},
    })
  }
  public override render(): void {
    if (this.removed) return
    this.points.map((point) => {
      point.render()
    })

    if (this.isEdit) {
      this.midPoints.map((minPoint) => {
        minPoint.render()
      })
    }

    if (this.isFocus && this.geometry && this.visibility === 'visible') {
      this.context.focus.set(this.getFeature() as GeoJSON.Feature, {
        armLength: 40,
        padding: 30,
      })
    } else {
      this.context.focus.remove(this.id)
    }

    // if (Array.isArray(this.options.position) && this.options.position.length > 1) {
    //   this.createTitles()
    // } else {
    //   this.removeTitles()
    // }

    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, [
      this.getFeature(),
      // ...this.titles,
    ] as GeoJSON.Feature[])
  }

  public getMidPoint(index: number): Point | null {
    const data = this.midPoints.at(index)
    if (!data) return null

    return Number(data.options.properties?.index) === index ? data : null
  }

  public getPoint(index: number): PointInstance | null {
    const point = this.points.at(index)
    if (!point) return null

    return Number(point.options.properties?.index) === index ? point : null
  }

  public createVertex(id: string, index: number, position: LngLat): PointInstance {
    const style: PointStyle = {
      'circle-radius': 5,
      'circle-stroke-color': this.options.style?.['line-color'] ?? DEFAULT_LINE_COLOR,
      ...this.options.vertexStyle,
    }

    return new Point(this.context.map, {
      // id: `${this.id}-node-${String(index)}`, // 建议 ID 加上 node 标识
      id, // 建议 ID 加上 node 标识
      isName: false,
      visibility: this.options.visibility,
      position,
      style,
      properties: {
        id: `${this.id}-node-${String(index)}`,
        index,
        type: PointType.VERTEX, // 标记类型，方便点击事件区分
      },
    })
  }

  public createMid(id: string, index: number, position: LngLat): Point {
    const style = {
      'circle-radius': 2,
      'circle-color': this.options.style?.['line-color'] ?? DEFAULT_LINE_COLOR,
      'circle-stroke-color': this.options.style?.['line-color'] ?? DEFAULT_LINE_COLOR,
      ...this.options.midStyle,
    }

    return new Point(this.context.map, {
      id, // 建议 ID 加上 mid 标识
      isName: false,
      visibility: this.options.visibility,
      position,
      style,
      properties: {
        id: `${this.id}-mid-${String(index)}`, // 建议 ID 加上 mid 标识
        index, // 这里的 index 代表它是第几段线上的中点
        type: PointType.MIDPOINT,
      },
    })
  }

  public createTitles(): Feature<LineString>[] {
    if (!Array.isArray(this.points) || this.points.length === 0) return []

    const length = this.points.length
    this.titles = this.points.flatMap((current, index) => {
      if (index === length - 1) return []
      if (!current.center) return []

      const next = this.points[index + 1]
      if (!next.center) return []

      const id = `line-title-${this.id}-${String(index)}`
      return lineString(
        [current.center.toArray(), next.center.toArray()],
        {
          meta: Meta.LINE_TITLE,
          visibility: this.options.visibility,
          isName: true,
          text: this.options.name,
          'text-size': this.options.style?.['text-size'],
          originId: this.id,
          id,
        },
        {
          id,
        },
      )
    })

    return this.titles as GeoJSON.Feature<GeoJSON.LineString>[]
  }

  public removeTitles(): GeoJSON.Feature<null>[] {
    this.titles = this.titles.map((item) => {
      return {
        ...item,
        geometry: null,
      }
    })

    return this.titles as GeoJSON.Feature<null>[]
  }

  public createPoint(): void {
    this.residentEvent.disabled()
    this.updateEvent.disabled()
    this.removePoint()

    const positions = this.options.position ?? []

    positions.forEach((current, i) => {
      this.points.push(
        this.createVertex(`${this.id}-node-${String(this.nodeSequence++)}`, i, current),
      )
    })

    this.syncMidPoints()
    this.restoreInteraction()
  }

  private restoreInteraction(): void {
    if (this.visibility !== 'visible') return
    if (this.isEdit) this.edit()
    else if (!this.isCreate) this.residentEvent.enabled()
  }

  /**
   * 插入一个新节点 (例如: 将中点转为实点时调用)
   * @param index 要插入的位置索引
   * @param position 新节点的坐标
   */
  public insertPoint(index: number, position: LngLat): PointInstance {
    if (!Number.isInteger(index) || index < 0 || index > this.points.length) {
      throw new RangeError('Invalid vertex index')
    }
    this.residentEvent.disabled()
    this.updateEvent.disabled()
    // 1. 同步原始数据
    this.options.position ??= []
    this.options.position.splice(index, 0, position)

    // 2. 创建新点实例并插入数组
    const newPoint = this.createVertex(
      `${this.id}-node-${String(this.nodeSequence++)}`,
      index,
      position,
    )
    this.points.splice(index, 0, newPoint)

    // 如果处于编辑状态，让新点立刻表现为编辑态
    if (this.isEdit) {
      newPoint.edit()
    }

    // 3. 重新修正索引并全量同步中点
    this.reindexPoints()
    this.syncMidPoints()
    this.restoreInteraction()
    this.render()

    return newPoint
  }

  /**
   * 更新某个实点的位置 (例如: 拖拽某个节点)
   * @param index 节点索引
   * @param position 拖拽后的新坐标
   * @param isRender 是否立即渲染
   */
  public updatePoint(index: number, position: LngLat, isRender = true): void {
    const point = this.getPoint(index)
    if (!point) return

    // 1. 同步原始数据
    if (this.options.position?.[index]) {
      this.options.position[index] = position
    }

    // 2. 移动实体点
    point.options.position = position

    // 3. 局部更新左右两个相邻的中点(提升性能，不用全量重绘)
    this.updateAdjacentMidPoints(index)

    // 4. 重绘线段 (触发 getFeature 变更)
    if (isRender) {
      this.render()
    }
  }

  /** 更新指定中点的坐标 (例如：拖拽中点时触发，但在松手前它还是个中点) */
  public updateMidPoint(index: number, position: LngLat): void {
    const midPoint = this.getMidPoint(index)
    if (!midPoint) return

    midPoint.options.position = position
  }

  public removePointAt(index: number): void {
    if (!Number.isInteger(index) || index < 0) return
    const point = this.points.at(index)
    if (!point) return

    this.residentEvent.disabled()
    this.updateEvent.disabled()
    this.options.position?.splice(index, 1)
    // 1. 从地图上移除
    point.remove()

    // 2. 从数组中移除
    this.points.splice(index, 1)

    // 3. 更新索引并重绘中点
    this.reindexPoints()
    this.syncMidPoints()
    this.restoreInteraction()
    this.render()
  }

  /** 清空所有点 (替代原有的 removePoint) */
  public clearAll(): void {
    this.update({ ...this.options, position: [] })
  }

  public removePoint(): void {
    this.points.forEach((point) => {
      point.remove()
    })
    this.points = []
    this.midPoints.forEach((mid) => {
      mid.remove()
    })
    this.midPoints = []
  }

  /**
   * 内部机制：全量重新生成所有的中点
   */
  protected syncMidPoints(): void {
    const previous = new globalThis.Map(
      this.midPoints.map((mid) => [String(mid.options.properties?.segment), mid]),
    )
    this.midPoints = []
    for (let i = 0; i < this.points.length - 1; i++) {
      const start = this.points[i]
      const end = this.points[i + 1]
      if (!start.center || !end.center) continue
      const segment = JSON.stringify([start.id, end.id])
      const position = this.calcMidPosition(start.center, end.center)
      const mid =
        previous.get(segment) ??
        this.createMid(`${this.id}-mid-${String(this.midSequence++)}`, i, position)
      previous.delete(segment)
      mid.options.position = position
      mid.options.properties = { ...mid.options.properties, index: i, segment }
      mid.options.visibility = this.isEdit ? this.visibility : 'none'
      this.midPoints.push(mid)
    }
    previous.forEach((mid) => {
      mid.remove()
    })
  }

  /**
   * 内部机制：修补数组增减后的索引及属性ID
   */
  protected reindexPoints(): void {
    this.points.forEach((point, i) => {
      if (point.options.properties) {
        point.options.properties.index = i
      }
      if ('index' in point.options) point.options.index = i + 1
    })
  }

  /**
   * 内部机制：只更新指定节点相邻的两个中点 (用于优化拖拽时的渲染性能)
   */
  protected updateAdjacentMidPoints(index: number): void {
    // 更新左侧中点 (index - 1)
    if (index > 0 && this.points[index - 1]) {
      const p1 = this.points[index - 1].center
      const p2 = this.points[index].center
      if (p1 && p2) {
        this.updateMidPoint(index - 1, this.calcMidPosition(p1, p2))
      }
    }
    // 更新右侧中点 (index)
    if (index < this.points.length - 1 && this.points[index + 1]) {
      const p1 = this.points[index].center
      const p2 = this.points[index + 1].center
      if (p1 && p2) {
        this.updateMidPoint(index, this.calcMidPosition(p1, p2))
      }
    }
  }

  /**
   * 内部计算：获取两点之间的中点坐标
   */
  protected calcMidPosition(p1: LngLat, p2: LngLat): LngLat {
    const midLng = (p1.lng + p2.lng) / 2
    const midLat = (p1.lat + p2.lat) / 2
    return new LngLat(midLng, midLat)
  }
}
