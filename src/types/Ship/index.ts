import type { BaseShipConstructor } from '@/types/Ship/BaseShip.ts'

export type * from './AisShip.ts'
export * from './BaseShip.ts'

export interface IShipOptions {
  plugins?: BaseShipConstructor[]
}
