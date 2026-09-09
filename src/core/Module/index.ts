import EventEmitter from 'eventemitter3'
import type { Map } from 'mapbox-gl'

import type { Context } from './Context.ts'
import { getOrCreateContext } from './Context.ts'

export abstract class Module extends EventEmitter {
  protected context: Context

  private readonly onMapRemove = (): void => {
    this.destroy()
  }

  protected detachLifecycle(): void {
    this.context.map.off('beforeRemove', this.onMapRemove)
  }

  /**
   * 构造函数，初始化地图上下文和选项配置
   * @param map - 地图实例对象
   */
  protected constructor(map: Map, attachMapLifecycle = true) {
    super()

    this.context = getOrCreateContext(map)

    this.onAdd()

    if (attachMapLifecycle) {
      this.context.map.once('beforeRemove', this.onMapRemove)
    }
  }

  public mount(): void {
    this.onAdd()
  }

  public destroy(): void {
    this.detachLifecycle()
    this.onRemove()
  }

  abstract onAdd(): void

  abstract onRemove(): void
}
