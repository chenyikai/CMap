import type { Map } from 'mapbox-gl'

import Collision from '@/core/Collision'
import { Module } from '@/core/Module'
import type { Tooltip } from '@/core/Tooltip'
import { ResidentEvent } from '@/modules/Ship/Events/ResidentEvent'
import { AisShip } from '@/modules/Ship/plugins/AisShip.ts'
import type { CollisionItemOptions } from '@/types/Collision/item.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'

class Ship extends Module {
  // options: IShipOptions
  ships: AisShip[] = []
  event: ResidentEvent

  private collision: Collision

  constructor(map: Map) {
    super(map)
    // this.options = options
    this.collision = new Collision(this.context.map)
    this.event = new ResidentEvent(map)
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

  // private get plugins(): IShipOptions['plugins'] {
  //   return this.options.plugins
  // }

  private createCollisions(): CollisionItemOptions[] {
    return this.tooltips.map((tooltip) => {
      return {
        ...tooltip.getAllBbox(),
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

  add(data: IAisShipOptions): AisShip {
    const ship: AisShip = new AisShip(this.context.map, data)
    this.ships.push(ship)
    this.event.add(ship)

    return ship
  }

  load(list: IAisShipOptions[]): AisShip[] {
    this.removeAll()

    this.ships = list.map((item) => this.add(item))

    this.render()
    this.collisionTooltip()

    return this.ships
  }

  remove(id: IAisShipOptions['id']): void {
    this.event.remove(id)

    const i = this.ships.findIndex((ship) => ship.id === id)
    if (i !== -1) {
      this.ships[i].remove()
      this.ships.splice(i, 1)
    }
  }

  removeAll(): void {
    this.collision.clear()

    this.ships.forEach((ship) => {
      ship.remove()
    })
    this.ships = []
  }

  render(): void {
    this.ships.forEach((ship) => {
      ship.render()
    })
  }
}

export default Ship
