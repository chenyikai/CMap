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

      if (features.length > 0) {
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
    this.fill.line!.insertPoint(this.count, e.lngLat)
    this.stop(e)
  }

  private stop = (e: MapMouseEvent): void => {
    e.preventDefault()
    const firstPoint = this.fill.line?.points.at(0)

    if (this.fill.line && firstPoint?.center) {
      const point = this.fill.line.insertPoint(this.count + 1, firstPoint.center)
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
    /* empty */
  }

  public override enabled(): void {
    this.context.map.doubleClickZoom.disable()
    //
    this.context.map.on('click', this.onClick)
    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.on('dblclick', this.stop)
    this.context.map.on('contextmenu', this.onContextmenu)
    this.changeStatus()
  }
  public override disabled(): void {
    this.context.map.off('click', this.onClick)
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('dblclick', this.stop)
    this.context.map.off('contextmenu', this.onContextmenu)

    setTimeout(() => {
      this.context.map.doubleClickZoom.enable()
    }, 0)
    this.changeStatus()
  }
}

export class FillUpdateEvent extends FillBaseEvent {
  protected dragStartLngLat: LngLat | null = null

  private onLineUpdate = (e: EventMessage<Line>, point: PointInstance): void => {
    if (!point.center || !this.fill.line) return

    const index = point.options.properties?.index as number

    if (index === 0) {
      const lastIndex = this.fill.line.points.length - 1
      this.fill.line.updatePoint(lastIndex, point.center)
    }

    this.fill.line.updatePoint(index, point.center)

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

    if (features.length > 0) {
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
    this.fill.line?.on(Event.UPDATE, this.onLineUpdate)

    this.fill.line?.on(Event.MID_UPDATE, this.onLineMidUpdate)

    this.fill.line?.on(Event.MID_DONE_UPDATE, this.onLineMidDoneUpdate)

    this.context.map.on('mousedown', this.fill.LAYER, this.onFillMousedown)

    this.context.eventManager.on(this.fill.id, this.fill.LAYER, 'mouseenter', this.onFillMouseenter)

    this.context.eventManager.on(this.fill.id, this.fill.LAYER, 'mouseleave', this.onFillMouseLeave)

    this.changeStatus()
  }

  public override disabled(): void {
    this.fill.line?.off(Event.UPDATE, this.onLineUpdate)

    this.fill.line?.off(Event.MID_UPDATE, this.onLineMidUpdate)

    this.fill.line?.off(Event.MID_DONE_UPDATE, this.onLineMidDoneUpdate)

    this.context.map.off('mousedown', this.fill.LAYER, this.onFillMousedown)

    this.context.eventManager.off(this.fill.id, 'mouseenter', this.onFillMouseenter)

    this.context.eventManager.off(this.fill.id, 'mouseleave', this.onFillMouseLeave)

    this.changeStatus()
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
    this.changeStatus()
  }

  public override disabled(): void {
    this.changeStatus()
  }
}
