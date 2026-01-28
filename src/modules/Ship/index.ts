import type { Map as MapboxGlMap } from 'mapbox-gl'

import Collision from '@/core/Collision'
import { Module } from '@/core/Module'
import type { Tooltip } from '@/core/Tooltip'
import type { BaseShip } from '@/modules/Ship/BaseShip.ts'
import { ResidentEvent } from '@/modules/Ship/Events/ResidentEvent'
import type { CollisionItemOptions } from '@/types/Collision/item.ts'
import type { IShipOptions } from '@/types/Ship'
import type { BaseShipConstructor, IBaseShipOptions } from '@/types/Ship/BaseShip.ts'

class Ship extends Module {
  options: IShipOptions
  ships: BaseShip<any>[] = []
  event: ResidentEvent

  private pluginRegistry = new Map<string, BaseShipConstructor>()
  private collision: Collision

  constructor(map: MapboxGlMap, options: IShipOptions) {
    super(map)
    this.options = options
    this.collision = new Collision(this.context.map)
    this.event = new ResidentEvent(map)

    this.registerPlugins(options.plugins)
  }

  override onAdd(): void {
    // throw new Error('Method not implemented.')
  }
  override onRemove(): void {
    // throw new Error('Method not implemented.')
  }

  get tooltips(): Tooltip[] {
    return this.ships.flatMap((ship) => ship.tooltip ?? [])
  }

  private registerPlugins(plugins: BaseShipConstructor[] = []): void {
    plugins.forEach((PluginClass) => {
      if (PluginClass.NAME) {
        this.pluginRegistry.set(PluginClass.NAME, PluginClass)
      } else {
        console.warn('Ship Plugin missing static NAME property:', PluginClass)
      }
    })
  }

  private createCollisions(): CollisionItemOptions[] {
    return this.tooltips.map((tooltip) => {
      return {
        ...tooltip.getSimpleBbox(),
        id: tooltip.id,
      }
    })
  }

  private collisionTooltip(): void {
    this.collision.load(this.createCollisions()).forEach((collision) => {
      const tooltip = this.tooltips.find((tooltip) => tooltip.id === collision.id)
      if (!tooltip) return

      if (collision.visible) {
        tooltip.setAnchor(collision.dir)
      } else {
        tooltip.hide()
      }
    })
  }

  add(data: IBaseShipOptions): BaseShip<any> | undefined {
    const Constructor = this.pluginRegistry.get(data.type)

    if (!Constructor) {
      console.warn(`No plugin registered for ship type: "${data.type}"`)
      return undefined
    }

    const ship = new Constructor(this.context.map, data)
    this.ships.push(ship)
    this.event.add(ship)

    return ship
  }

  load(list: IBaseShipOptions[]): BaseShip<any>[] {
    this.removeAll()

    const newShips: BaseShip<any>[] = []
    list.forEach((item) => {
      const ship = this.add(item)
      if (ship) {
        newShips.push(ship)
      }
    })

    this.render()
    this.collisionTooltip()

    return newShips
  }

  remove(id: IBaseShipOptions['id']): void {
    this.event.remove(id)

    const i = this.ships.findIndex((ship) => ship.id === id)
    if (i !== -1) {
      this.ships[i].remove()
      this.ships.splice(i, 1)
    }
  }

  removeAll(): void {
    this.collision.clear()

    // 频率过高的设置图层数据导致问题
    this.ships.forEach((ship) => {
      ship.remove()
    })
    this.ships = []

    this.event.removeAll()

    // setTimeout(() => {
    // const source = this.context.map.getSource('mapbox-gl-ship-source')
    // if (source?.type === 'geojson') {
    //   source.setData({
    //     type: 'FeatureCollection',
    //     features: [],
    //   })
    // }
  }

  render(): void {
    this.ships.forEach((ship) => {
      ship.render()
    })
  }

  get(id: string | number): BaseShip<any> | undefined {
    return this.ships.find((item) => item.id === id)
  }

  select(id: IBaseShipOptions['id']): void {
    const ship = this.get(id)
    if (ship) {
      ship.select()
    }
  }

  unselect(id: IBaseShipOptions['id']): void {
    const ship = this.get(id)
    if (ship) {
      ship.unselect()
    }
  }
}

export default Ship
