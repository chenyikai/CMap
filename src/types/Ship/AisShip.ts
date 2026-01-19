import type { IBaseShipOptions } from '@/types/Ship/BaseShip.ts'

export interface IAisShipOptions extends IBaseShipOptions {
  outLine?: boolean
  readonly type: 'Ais'
}
