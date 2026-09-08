import type { Map, MapMouseEvent } from 'mapbox-gl'
import type { LngLat } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { Circle } from '@/modules/Plot/plugins/Circle'
import type { Point } from '@/modules/Plot/plugins/Point'
import { CURSOR, Event } from '@/modules/Plot/vars.ts'
import type { EventMessage } from '@/types/EventState'

export abstract class CircleBaseEvent extends EventState {
  protected circle: Circle

  protected constructor(map: Map, circle: Circle) {
    super(map)
    this.circle = circle
  }

  public abstract override onAdd(): void
  public abstract override onRemove(): void
  public abstract override enabled(): void
  public abstract override disabled(): void
}

export class CircleCreateEvent extends CircleBaseEvent {
  private onClick = (e: MapMouseEvent): void => {
    if (!this.circle.center) {
      this.circle.setCenter(e.lngLat)
      this.circle.setRadius(0)
      return
    }

    this.circle.setRadiusFrom(e.lngLat)
    this.finish(e)
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.CREATE
    if (!this.circle.center) return
    this.circle.setRadiusFrom(e.lngLat)
    this.circle.emit(Event.UPDATE, this.message<Circle>(e, this.circle))
  }

  private onContextmenu = (e: MapMouseEvent): void => {
    if (!this.circle.center) return
    this.circle.setRadiusFrom(e.lngLat)
    this.finish(e)
  }

  private finish(e: MapMouseEvent): void {
    if ((this.circle.radius ?? 0) <= 0) return
    e.preventDefault()
    this.circle.stop()
    this.circle.edit()
    this.circle.emit(Event.CREATE, this.message<Circle>(e, this.circle))
  }

  constructor(map: Map, circle: Circle) {
    super(map, circle)
  }

  public override onAdd(): void {
    /* empty */
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return
    this.lockDoubleClickZoom()
    this.context.map.on('click', this.onClick)
    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.on('contextmenu', this.onContextmenu)
    this.status = EventState.ON
  }

  public override disabled(): void {
    this.context.map.off('click', this.onClick)
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('contextmenu', this.onContextmenu)
    this.context.map.getCanvasContainer().style.cursor = CURSOR.EMPTY
    this.unlockDoubleClickZoom()
    this.status = EventState.OFF
  }
}

export class CircleUpdateEvent extends CircleBaseEvent {
  private dragStartLngLat: LngLat | null = null

  private onCenterBeforeUpdate = (e: EventMessage<Point>): void => {
    this.circle.emit(
      Event.BEFORE_UPDATE,
      this.message<Circle>(e.originEvent, this.circle),
      e.instance,
    )
  }

  private onCenterUpdate = (e: EventMessage<Point>): void => {
    if (!e.instance.center) return
    this.circle.setCenter(e.instance.center)
    this.circle.emit(Event.UPDATE, this.message<Circle>(e.originEvent, this.circle), e.instance)
  }

  private onCenterDoneUpdate = (e: EventMessage<Point>): void => {
    this.circle.render()
    this.circle.emit(
      Event.DONE_UPDATE,
      this.message<Circle>(e.originEvent, this.circle),
      e.instance,
    )
  }

  private onRadiusBeforeUpdate = (e: EventMessage<Point>): void => {
    this.circle.emit(
      Event.BEFORE_UPDATE,
      this.message<Circle>(e.originEvent, this.circle),
      e.instance,
    )
  }

  private onRadiusUpdate = (e: EventMessage<Point>): void => {
    if (!e.instance.center) return
    this.circle.setRadiusFrom(e.instance.center)
    this.circle.emit(Event.UPDATE, this.message<Circle>(e.originEvent, this.circle), e.instance)
  }

  private onRadiusDoneUpdate = (e: EventMessage<Point>): void => {
    this.circle.render()
    this.circle.emit(
      Event.DONE_UPDATE,
      this.message<Circle>(e.originEvent, this.circle),
      e.instance,
    )
  }

  private onCircleMousedown = (e: MapMouseEvent): void => {
    const controlPoints = [this.circle.centerPoint, this.circle.radiusPoint].filter(
      (point): point is Point => point !== null,
    )
    const layers = [...new Set(controlPoints.map((point) => point.LAYER))]
    const features = layers.length
      ? this.context.map.queryRenderedFeatures(e.point, { layers })
      : []
    const controlIds = new Set(controlPoints.map((point) => point.id))
    if (features.some((feature) => controlIds.has(String(feature.properties?.id ?? feature.id)))) {
      return
    }

    e.preventDefault()
    this.dragStartLngLat = e.lngLat
    this.context.map.getCanvasContainer().style.cursor = CURSOR.MOVE
    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.once('mouseup', this.onMouseup)
    this.circle.emit(Event.BEFORE_UPDATE, this.message<Circle>(e, this.circle))
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.MOVE
    this.circle.move(e.lngLat)
    this.dragStartLngLat = e.lngLat
    this.circle.emit(Event.UPDATE, this.message<Circle>(e, this.circle))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.cancelDrag()
    this.circle.render()
    this.circle.emit(Event.DONE_UPDATE, this.message<Circle>(e, this.circle))
  }

  private onMouseenter = (): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.CLICK
  }

  private onMouseleave = (): void => {
    if (!this.dragStartLngLat) this.context.map.getCanvasContainer().style.cursor = CURSOR.EMPTY
  }

  constructor(map: Map, circle: Circle) {
    super(map, circle)
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
    this.bindControlPoint(this.circle.centerPoint, true)
    this.bindControlPoint(this.circle.radiusPoint, true)
    this.context.eventManager.on(
      this.circle.id,
      this.circle.LAYER,
      'mousedown',
      this.onCircleMousedown,
    )
    this.context.eventManager.on(this.circle.id, this.circle.LAYER, 'mouseenter', this.onMouseenter)
    this.context.eventManager.on(this.circle.id, this.circle.LAYER, 'mouseleave', this.onMouseleave)
    this.status = EventState.ON
  }

  public cancelDrag(): void {
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('mouseup', this.onMouseup)
    this.dragStartLngLat = null
    this.context.map.getCanvasContainer().style.cursor = CURSOR.EMPTY
  }

  public override disabled(): void {
    this.cancelDrag()
    this.bindControlPoint(this.circle.centerPoint, false)
    this.bindControlPoint(this.circle.radiusPoint, false)
    this.context.eventManager.off(this.circle.id, 'mousedown', this.onCircleMousedown)
    this.context.eventManager.off(this.circle.id, 'mouseenter', this.onMouseenter)
    this.context.eventManager.off(this.circle.id, 'mouseleave', this.onMouseleave)
    this.status = EventState.OFF
  }

  private bindControlPoint(point: Point | null, enabled: boolean): void {
    if (!point) return
    const isCenter = point === this.circle.centerPoint
    const before = isCenter ? this.onCenterBeforeUpdate : this.onRadiusBeforeUpdate
    const update = isCenter ? this.onCenterUpdate : this.onRadiusUpdate
    const done = isCenter ? this.onCenterDoneUpdate : this.onRadiusDoneUpdate
    if (enabled) {
      point.edit()
      point.on(Event.BEFORE_UPDATE, before)
      point.on(Event.UPDATE, update)
      point.on(Event.DONE_UPDATE, done)
    } else {
      point.off(Event.BEFORE_UPDATE, before)
      point.off(Event.UPDATE, update)
      point.off(Event.DONE_UPDATE, done)
      point.unedit()
      point.residentEvent.disabled()
    }
  }
}

export class CircleResidentEvent extends CircleBaseEvent {
  private onMouseenter = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.CLICK
    this.circle.setState({ hover: true })
    this.circle.emit(Event.HOVER, this.message<Circle>(e, this.circle))
  }

  private onMouseleave = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = CURSOR.EMPTY
    this.circle.setState({ hover: false })
    this.circle.emit(Event.UN_HOVER, this.message<Circle>(e, this.circle))
  }

  private onClick = (e: MapMouseEvent): void => {
    this.circle.emit(Event.CLICK, this.message<Circle>(e, this.circle))
  }

  private onDblclick = (e: MapMouseEvent): void => {
    e.preventDefault()
    this.circle.emit(Event.DBL_CLICK, this.message<Circle>(e, this.circle))
  }

  constructor(map: Map, circle: Circle) {
    super(map, circle)
  }

  public override onAdd(): void {
    /* empty */
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return
    this.context.eventManager.on(this.circle.id, this.circle.LAYER, 'mouseenter', this.onMouseenter)
    this.context.eventManager.on(this.circle.id, this.circle.LAYER, 'mouseleave', this.onMouseleave)
    this.context.eventManager.on(this.circle.id, this.circle.LAYER, 'click', this.onClick)
    this.context.eventManager.on(this.circle.id, this.circle.LAYER, 'dblclick', this.onDblclick)
    this.status = EventState.ON
  }

  public override disabled(): void {
    this.context.eventManager.off(this.circle.id, 'mouseenter', this.onMouseenter)
    this.context.eventManager.off(this.circle.id, 'mouseleave', this.onMouseleave)
    this.context.eventManager.off(this.circle.id, 'click', this.onClick)
    this.context.eventManager.off(this.circle.id, 'dblclick', this.onDblclick)
    this.status = EventState.OFF
  }
}
