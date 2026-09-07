import type { Map, MapMouseEvent } from 'mapbox-gl'
import type { LngLat } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { Line } from '@/modules/Plot/plugins/Line'
import type { Point } from '@/modules/Plot/plugins/Point'
import { CURSOR, Event } from '@/modules/Plot/vars.ts'
import type { EventMessage } from '@/types/EventState'

export abstract class LineBaseEvent extends EventState {
  protected line: Line

  protected constructor(map: Map, line: Line) {
    super(map)

    this.line = line
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract override enabled(): void

  public abstract override disabled(): void
}

export class LineCreateEvent extends LineBaseEvent {
  private count = 0
  private drawPoint: LngLat | null = null

  private onClick = (e: MapMouseEvent): void => {
    // 点击过一次之后 计算结束事件
    if (this.count >= 1) {
      const layers = new Set(
        [...this.line.points, ...this.line.midPoints].map((item) => item.LAYER),
      )

      const features = this.context.map.queryRenderedFeatures(e.point, {
        layers: [...layers],
      })

      if (
        features.some((feature) =>
          [...this.line.points, ...this.line.midPoints].some(
            (point) => String(feature.properties?.id ?? feature.id) === point.id,
          ),
        )
      ) {
        this.stop(e)
        return
      }
    }

    this.line.insertPoint(this.count, e.lngLat)
    this.count++
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'crosshair'
    if (!this.line.options.position) return

    this.setDrawLngLat(e.lngLat)
    this.line.render()
  }

  private stop = (e: MapMouseEvent): void => {
    e.preventDefault()
    if ((this.line.options.position?.length ?? 0) < 2) return
    this.line.stop()

    this.context.map.getCanvasContainer().style.cursor = ''
    this.setDrawLngLat(null)
    this.count = 0

    this.disabled()

    this.line.edit()

    this.line.render()
    this.line.emit(Event.CREATE, this.message<Line>(e, this.line))
  }

  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    /* empty */
  }
  public override onRemove(): void {
    this.disabled()
  }

  public setDrawLngLat(position: LngLat | null): void {
    this.drawPoint = position
  }

  public getDrawLngLat(): LngLat | null {
    return this.drawPoint
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.count = this.line.options.position?.length ?? 0
    this.lockDoubleClickZoom()

    this.context.map.on('click', this.onClick)
    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.on('dblclick', this.stop)
    this.status = EventState.ON
  }
  public override disabled(): void {
    this.context.map.off('click', this.onClick)
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('dblclick', this.stop)
    this.count = 0
    this.drawPoint = null
    this.context.map.getCanvasContainer().style.cursor = ''

    this.unlockDoubleClickZoom()
    this.status = EventState.OFF
  }
}

export class LineUpdateEvent extends LineBaseEvent {
  protected dragStartLngLat: LngLat | null = null
  protected modifyMid: Point | null = null

  private onVertexUpdate = (e: EventMessage<Point>): void => {
    const current = e.instance
    const { index } = current.options.properties ?? {}

    if (typeof index !== 'number' || !current.center) return

    this.line.updatePoint(index, current.center)

    this.line.emit(Event.UPDATE, this.message<Line>(e.originEvent, this.line), current)
  }

  private onMidBeforeUpdate = (e: EventMessage<Point>): void => {
    this.setModifyLngLat(e.instance)
    this.line.emit(
      Event.MID_BEFORE_UPDATE,
      this.message<Line>(e.originEvent, this.line),
      e.instance,
    )
  }

  private onMidUpdate = (e: EventMessage<Point>): void => {
    const { index } = e.instance.options.properties ?? {}
    const { position } = this.line.options
    if (position && typeof index === 'number' && e.instance.center) {
      this.line.render()
      this.line.emit(Event.MID_UPDATE, this.message<Line>(e.originEvent, this.line), e.instance)
    }
  }

  private onMidDone = (e: EventMessage<Point>): void => {
    const { index } = e.instance.options.properties ?? {}
    const position = e.instance.center
    if (typeof index !== 'number' || !position) return
    this.setModifyLngLat(null)
    this.line.insertPoint(index + 1, position)
    this.line.emit(Event.MID_DONE_UPDATE, this.message<Line>(e.originEvent, this.line))
  }

  private onLineMousedown = (e: MapMouseEvent): void => {
    const layers = new Set([...this.line.points, ...this.line.midPoints].map((item) => item.LAYER))

    const features = this.context.map.queryRenderedFeatures(e.point, {
      layers: [...layers],
    })

    if (features.length > 0) {
      return
    }

    e.preventDefault()
    this.context.map.getCanvasContainer().style.cursor = CURSOR.MOVE
    this.dragStartLngLat = e.lngLat

    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.once('mouseup', this.onMouseup)

    this.line.emit(Event.BEFORE_UPDATE, this.message<Line>(e, this.line))
  }

  private onLineMouseenter = (): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.CLICK
  }

  private onLineMouseLeave = (): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.EMPTY
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.MOVE
    const current = e.lngLat
    this.line.move(current)
    this.dragStartLngLat = current
    this.line.emit(Event.UPDATE, this.message<Line>(e, this.line))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('mousedown', this.line.LAYER, this.onLineMousedown)
    this.dragStartLngLat = null
    this.line.render()

    this.line.emit(Event.DONE_UPDATE, this.message<Line>(e, this.line))
  }

  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    /* empty */
  }

  public override onRemove(): void {
    this.disabled()
  }

  public setModifyLngLat(point: Point | null): void {
    this.modifyMid = point
  }

  public getModifyLngLat(): Point | null {
    return this.modifyMid
  }

  public setDragLngLat(position: LngLat | null): void {
    this.dragStartLngLat ??= position
  }

  public getDragLngLat(): LngLat | null {
    return this.dragStartLngLat
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.line.points.forEach((point) => {
      point.on(Event.UPDATE, this.onVertexUpdate)
    })
    this.line.midPoints.forEach((mid) => {
      mid.on(Event.BEFORE_UPDATE, this.onMidBeforeUpdate)
      mid.on(Event.UPDATE, this.onMidUpdate)
      mid.on(Event.DONE_UPDATE, this.onMidDone)
    })

    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mousedown', this.onLineMousedown)
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseleave', this.onLineMouseLeave)

    this.status = EventState.ON
  }

  public cancelDrag(): void {
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('mouseup', this.onMouseup)
    this.dragStartLngLat = null
    this.modifyMid = null
    this.context.map.getCanvasContainer().style.cursor = ''
  }

  public override disabled(): void {
    this.cancelDrag()
    this.context.eventManager.off(this.line.id, 'mousedown', this.onLineMousedown)
    this.line.points.forEach((point) => {
      point.off(Event.UPDATE, this.onVertexUpdate)
    })
    this.line.midPoints.forEach((mid) => {
      mid.off(Event.BEFORE_UPDATE, this.onMidBeforeUpdate)
      mid.off(Event.UPDATE, this.onMidUpdate)
      mid.off(Event.DONE_UPDATE, this.onMidDone)
    })

    this.context.eventManager.off(this.line.id, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.off(this.line.id, 'mouseleave', this.onLineMouseLeave)
    this.status = EventState.OFF
  }
}

export class LineResidentEvent extends LineBaseEvent {
  private onLineMouseenter = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
    this.line.setState({ hover: true })
    this.line.points.forEach((point) => {
      point.setState({ hover: true })
    })
    this.line.emit(Event.HOVER, this.message<Line>(e, this.line))
  }

  private onLineMouseLeave = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.line.setState({ hover: false })
    this.line.points.forEach((point) => {
      point.setState({ hover: false })
    })
    this.line.emit(Event.UN_HOVER, this.message<Line>(e, this.line))
  }

  private onClick = (e: EventMessage<Point>): void => {
    this.line.emit(Event.CLICK, this.message<Line>(e.originEvent, this.line))
  }

  private onLineClick = (e: MapMouseEvent): void => {
    const layers = new Set([...this.line.points, ...this.line.midPoints].map((item) => item.LAYER))

    const features = this.context.map.queryRenderedFeatures(e.point, {
      layers: [...layers],
    })

    if (features.length > 0) {
      return
    }

    this.line.emit(Event.CLICK, this.message<Line>(e, this.line))
  }

  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.line.points.forEach((point) => {
      point.on(Event.CLICK, this.onClick)
    })
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseleave', this.onLineMouseLeave)
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'click', this.onLineClick)
    this.status = EventState.ON
  }

  public override disabled(): void {
    this.line.points.forEach((point) => {
      point.off(Event.CLICK, this.onClick)
    })

    this.context.eventManager.off(this.line.id, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.off(this.line.id, 'mouseleave', this.onLineMouseLeave)
    this.context.eventManager.off(this.line.id, 'click', this.onLineClick)
    this.status = EventState.OFF
  }
}
