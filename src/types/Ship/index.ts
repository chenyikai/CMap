// import type { BaseShipConstructor } from '@/types/Ship/BaseShip.ts'

import type { AisShip } from '@/modules/Ship/plugins/AisShip.ts'

export interface IShipOptions {
  plugins?: AisShip[]
}
