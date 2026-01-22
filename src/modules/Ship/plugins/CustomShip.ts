import type { Map } from 'mapbox-gl'

import { AisShip } from '@/modules/Ship/plugins/AisShip.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'

export class CustomShip extends AisShip {
  override readonly NAME: string = 'Custom'
  constructor(map: Map, options: IAisShipOptions) {
    super(map, options)

    console.log(this.context)
  }
}
