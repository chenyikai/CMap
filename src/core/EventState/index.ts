import type { Map, MapMouseEvent } from 'mapbox-gl'

import { Module } from '@/core/Module'
import type { EventMessage } from '@/types/EventState'
import { EventStatus } from '@/types/EventState'

export abstract class EventState extends Module {
  private static zoomLocks = new WeakMap<Map, { count: number; enabled: boolean }>()
  private ownsZoomLock = false

  protected lockDoubleClickZoom(): void {
    if (this.ownsZoomLock) return
    const map = this.context.map
    const lock = EventState.zoomLocks.get(map) ?? {
      count: 0,
      enabled: map.doubleClickZoom.isEnabled(),
    }
    lock.count++
    EventState.zoomLocks.set(map, lock)
    this.ownsZoomLock = true
    map.doubleClickZoom.disable()
  }

  protected unlockDoubleClickZoom(): void {
    if (!this.ownsZoomLock) return
    this.ownsZoomLock = false
    const map = this.context.map
    const lock = EventState.zoomLocks.get(map)
    if (!lock) return
    if (--lock.count === 0) {
      if (lock.enabled) map.doubleClickZoom.enable()
      EventState.zoomLocks.delete(map)
    }
  }
  public status: EventStatus = EventStatus.OFF
  static ON: EventStatus = EventStatus.ON
  static OFF: EventStatus = EventStatus.OFF

  protected constructor(map: Map, attachMapLifecycle = true) {
    super(map, attachMapLifecycle)
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public switch(): EventStatus {
    if (this.status === EventState.ON) {
      this.disabled()
    } else if (this.status === EventState.OFF) {
      this.enabled()
    }

    return this.status
  }

  public changeStatus(): void {
    if (this.status === EventState.ON) {
      this.status = EventStatus.OFF
    } else if (this.status === EventStatus.OFF) {
      this.status = EventStatus.ON
    }
  }

  public message<T>(e: MapMouseEvent, instance: T): EventMessage<T> {
    return {
      originEvent: e,
      instance,
    }
  }

  public abstract enabled(): void

  public abstract disabled(): void
}
