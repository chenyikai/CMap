import type { Map, MapMouseEvent } from 'mapbox-gl'
import type { LngLat } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { Fill } from '@/modules/Plot/plugins/Fill'
import type { Line } from '@/modules/Plot/plugins/Line'
import { CURSOR, Event } from '@/modules/Plot/vars.ts'
import type { EventMessage } from '@/types/EventState'
import type { PointInstance } from '@/types/Plot/Point.ts'

export abstract class FillBaseEvent extends EventState {
  protected fill: Fill

  protected constructor(map: Map, fill: Fill) {
    super(map)

    this.fill = fill
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract override enabled(): void

  public abstract override disabled(): void
}

export class FillCreateEvent extends FillBaseEvent {
  private count = 0
  private drawPoint: LngLat | null = null

  private onClick = (e: MapMouseEvent): void => {
    // 点击过一次之后 计算结束事件
    if (this.count > 1) {
      const layers = new Set(
        [...(this.fill.line?.points ?? []), ...(this.fill.line?.midPoints ?? [])].map(
          (item) => item.LAYER,
        ),
      )

      const features = this.context.map.queryRenderedFeatures(e.point, {
        layers: [...layers],
      })

      if (
        this.count >= 3 &&
        features.some(
          (feature) =>
            String(feature.properties?.id ?? feature.id) === this.fill.line?.points[0]?.id,
        )
      ) {
        this.stop(e)
        return
      }
    }

    if (!Array.isArray(this.fill.options.position)) {
      this.fill.options.position = []
      this.fill.createLine()
    }

    this.fill.line!.insertPoint(this.count, e.lngLat)
    this.fill.options.position = this.fill.line?.options.position

    this.count++
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.CREATE
    this.setDrawLngLat(e.lngLat)
    this.fill.render()

    this.fill.emit(Event.UPDATE, this.message<Fill>(e, this.fill))
  }

  private onContextmenu = (e: MapMouseEvent): void => {
    if (!this.fill.line || this.count < 2) return
    this.fill.line.insertPoint(this.count, e.lngLat)
    this.count++
    this.stop(e)
  }

  private stop = (e: MapMouseEvent): void => {
    e.preventDefault()
    if (!this.fill.line || this.count < 3) return
    const distinct = new Set(
      this.fill.line.options.position?.map((position) => position.toArray().join(',')),
    )
    if (distinct.size < 3) return
    const firstPoint = this.fill.line.points.at(0)

    if (firstPoint?.center) {
      const point = this.fill.line.insertPoint(this.count, firstPoint.center)
      point.hide()
    }

    this.context.map.getCanvasContainer().style.cursor = CURSOR.EMPTY
    this.setDrawLngLat(null)
    this.count = 0
    this.fill.setState({ create: false })
    this.disabled()

    this.fill.edit()
    this.fill.emit(Event.CREATE, this.message<Fill>(e, this.fill))
  }

  constructor(map: Map, fill: Fill) {
    super(map, fill)
  }

  public setDrawLngLat(position: LngLat | null): void {
    this.drawPoint = position
    this.fill.line?.createEvent.setDrawLngLat(position)
  }

  public getDrawLngLat(): LngLat | null {
    return this.drawPoint
  }

  public override onAdd(): void {
    /* empty */
  }
  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.count = this.fill.line?.points.length ?? 0
    this.lockDoubleClickZoom()
    //
    this.context.map.on('click', this.onClick)
    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.on('dblclick', this.stop)
    this.context.map.on('contextmenu', this.onContextmenu)
    this.status = EventState.ON
  }
  public override disabled(): void {
    this.context.map.off('click', this.onClick)
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('dblclick', this.stop)
    this.context.map.off('contextmenu', this.onContextmenu)
    this.count = 0
    this.setDrawLngLat(null)
    this.context.map.getCanvasContainer().style.cursor = ''

    this.unlockDoubleClickZoom()
    this.status = EventState.OFF
  }
}

export class FillUpdateEvent extends FillBaseEvent {
  protected dragStartLngLat: LngLat | null = null

  private onLineUpdate = (e: EventMessage<Line>, point?: PointInstance): void => {
    if (!point) {
      this.fill.render()
      this.fill.emit(Event.UPDATE, this.message<Fill>(e.originEvent, this.fill))
      return
    }
    if (!point.center || !this.fill.line) return

    const index = point.options.properties?.index as number

    if (index === 0) {
      const lastIndex = this.fill.line.points.length - 1
      this.fill.line.updatePoint(lastIndex, point.center, false)
    }

    this.fill.render()

    this.fill.emit(Event.UPDATE, this.message<Fill>(e.originEvent, this.fill), point)
  }

  private onLineMidUpdate = (e: EventMessage<Line>): void => {
    this.fill.render()

    this.fill.emit(Event.MID_UPDATE, this.message<Fill>(e.originEvent, this.fill))
  }

  private onLineMidDoneUpdate = (e: EventMessage<Line>): void => {
    this.fill.line?.points.at(-1)?.hide()

    this.fill.emit(Event.MID_DONE_UPDATE, this.message<Fill>(e.originEvent, this.fill))
  }

  private onFillMousedown = (e: MapMouseEvent): void => {
    const layers = new Set(
      [...(this.fill.line?.points ?? []), ...(this.fill.line?.midPoints ?? [])].map(
        (item) => item.LAYER,
      ),
    )

    const features = this.context.map.queryRenderedFeatures(e.point, {
      layers: [...layers, this.fill.line?.LAYER ?? ''],
    })

    if (
      features.some((feature) =>
        [
          this.fill.line?.id,
          ...(this.fill.line?.points.map((point) => point.id) ?? []),
          ...(this.fill.line?.midPoints.map((point) => point.id) ?? []),
        ].includes(String(feature.properties?.id ?? feature.id)),
      )
    ) {
      return
    }

    e.preventDefault()
    this.context.map.getCanvasContainer().style.cursor = 'move'
    this.setDragLngLat(e.lngLat)

    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.once('mouseup', this.onMouseup)

    this.fill.emit(Event.BEFORE_UPDATE, this.message<Fill>(e, this.fill))
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'move'
    const current = e.lngLat
    this.fill.move(current)
    this.setDragLngLat(current)
    this.fill.emit(Event.UPDATE, this.message<Fill>(e, this.fill))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
    this.context.map.off('mousemove', this.onMousemove)
    this.setDragLngLat(null)
    this.fill.render()

    this.fill.emit(Event.DONE_UPDATE, this.message<Fill>(e, this.fill))
  }

  private onFillMouseenter = (): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
  }

  private onFillMouseLeave = (): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
  }

  constructor(map: Map, fill: Fill) {
    super(map, fill)
  }

  public setDragLngLat(position: LngLat | null): void {
    this.dragStartLngLat = position
  }

  public getDragLngLat(): LngLat | null {
    return this.dragStartLngLat
  }

  public override onAdd(): void {
    /* empty */
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.fill.line?.on(Event.UPDATE, this.onLineUpdate)

    this.fill.line?.on(Event.MID_UPDATE, this.onLineMidUpdate)

    this.fill.line?.on(Event.MID_DONE_UPDATE, this.onLineMidDoneUpdate)

    this.context.eventManager.on(this.fill.id, this.fill.LAYER, 'mousedown', this.onFillMousedown)

    this.context.eventManager.on(this.fill.id, this.fill.LAYER, 'mouseenter', this.onFillMouseenter)

    this.context.eventManager.on(this.fill.id, this.fill.LAYER, 'mouseleave', this.onFillMouseLeave)

    this.status = EventState.ON
  }

  public cancelDrag(): void {
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('mouseup', this.onMouseup)
    this.dragStartLngLat = null
    this.context.map.getCanvasContainer().style.cursor = ''
  }

  public override disabled(): void {
    this.cancelDrag()
    this.fill.line?.off(Event.UPDATE, this.onLineUpdate)

    this.fill.line?.off(Event.MID_UPDATE, this.onLineMidUpdate)

    this.fill.line?.off(Event.MID_DONE_UPDATE, this.onLineMidDoneUpdate)

    this.context.eventManager.off(this.fill.id, 'mousedown', this.onFillMousedown)

    this.context.eventManager.off(this.fill.id, 'mouseenter', this.onFillMouseenter)

    this.context.eventManager.off(this.fill.id, 'mouseleave', this.onFillMouseLeave)

    this.status = EventState.OFF
  }
}

export class FillResidentEvent extends FillBaseEvent {
  constructor(map: Map, fill: Fill) {
    super(map, fill)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.status = EventState.ON
  }

  public override disabled(): void {
    this.status = EventState.OFF
  }
}
