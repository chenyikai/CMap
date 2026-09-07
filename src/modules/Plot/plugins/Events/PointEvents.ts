import type { Map, MapMouseEvent } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { Point } from '@/modules/Plot/plugins/Point'
import { Event } from '@/modules/Plot/vars.ts'

export abstract class PointBaseEvent<T extends Point = Point> extends EventState {
  protected point: T

  protected constructor(map: Map, point: T) {
    super(map)

    this.point = point
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract override enabled(): void

  public abstract override disabled(): void
}

export class PointCreateEvent<T extends Point = Point> extends PointBaseEvent<T> {
  private onClick = (e: MapMouseEvent): void => {
    this.point.update({
      ...this.point.options,
      position: e.lngLat,
    })

    this.point.emit(Event.CREATE, this.message<Point>(e, this.point))

    this.point.stop()

    this.point.edit()
  }

  private onMousemove = (): void => {
    this.context.map.getCanvasContainer().style.cursor = 'crosshair'
  }

  constructor(map: Map, point: T) {
    super(map, point)
  }

  public override onAdd(): void {
    /* empty */
  }
  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.context.map.on('click', this.onClick)
    this.context.map.on('mousemove', this.onMousemove)
    this.status = EventState.ON
  }
  public override disabled(): void {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.context.map.off('click', this.onClick)
    this.context.map.off('mousemove', this.onMousemove)
    this.status = EventState.OFF
  }
}

export class PointUpdateEvent<T extends Point = Point> extends PointBaseEvent<T> {
  private onMousedown = (e: MapMouseEvent): void => {
    e.preventDefault()
    this.context.map.getCanvasContainer().style.cursor = 'move'

    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.once('mouseup', this.onMouseup)

    this.point.emit(Event.BEFORE_UPDATE, this.message<Point>(e, this.point))
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'move'
    this.point.move(e.lngLat)

    this.point.emit(Event.UPDATE, this.message<Point>(e, this.point))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    // this.disabled()
    this.cancelDrag()

    this.point.render()

    this.point.emit(Event.DONE_UPDATE, this.message<Point>(e, this.point))
  }

  constructor(map: Map, point: T) {
    super(map, point)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mousedown', this.onMousedown)
    this.status = EventState.ON
  }

  public cancelDrag(): void {
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('mouseup', this.onMouseup)
    this.context.map.getCanvasContainer().style.cursor = ''
  }

  public override disabled(): void {
    this.cancelDrag()
    this.context.eventManager.off(this.point.id, 'mousedown', this.onMousedown)
    this.status = EventState.OFF
  }
}

export class PointResidentEvent<T extends Point = Point> extends PointBaseEvent<T> {
  private onMouseEnter = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
    const message = this.message<Point>(e, this.point)
    this.point.setState({ hover: true })
    this.point.emit(Event.HOVER, message)
  }

  private onMouseLeave = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    const message = this.message<Point>(e, this.point)
    this.point.setState({ hover: false })
    this.point.emit(Event.UN_HOVER, message)
  }

  private onClick = (e: MapMouseEvent): void => {
    const message = this.message<Point>(e, this.point)
    this.point.emit(Event.CLICK, message)
  }

  private onDblclick = (e: MapMouseEvent): void => {
    e.preventDefault()
    const message = this.message<Point>(e, this.point)
    this.point.emit(Event.DBL_CLICK, message)
  }

  constructor(map: Map, point: T) {
    super(map, point)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'dblclick', this.onDblclick)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mouseenter', this.onMouseEnter)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mouseleave', this.onMouseLeave)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'click', this.onClick)
    this.status = EventState.ON
  }

  public override disabled(): void {
    this.context.eventManager.off(this.point.id, 'dblclick', this.onDblclick)

    this.context.eventManager.off(this.point.id, 'mouseenter', this.onMouseEnter)

    this.context.eventManager.off(this.point.id, 'mouseleave', this.onMouseLeave)

    this.context.eventManager.off(this.point.id, 'click', this.onClick)
    this.status = EventState.OFF
  }
}
