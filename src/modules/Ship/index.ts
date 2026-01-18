import type { Map } from 'mapbox-gl'

import { Module } from '@/core/Module'
import type { IShipOptions } from '@/types/Ship'

class Ship extends Module {
  options: IShipOptions

  constructor(map: Map, options: IShipOptions) {
    super(map)
    this.options = options
  }

  override onAdd(): void {
    throw new Error('Method not implemented.')
  }
  override onRemove(): void {
    throw new Error('Method not implemented.')
  }
}

export default Ship
