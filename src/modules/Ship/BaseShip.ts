import type * as GeoJSON from 'geojson'
import type { Map, MapMouseEvent, Point } from 'mapbox-gl'

import { Module } from '@/core/Module'
import type { UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'
import type { IBaseShipOptions, Orientation, Shape } from '@/types/Ship/BaseShip.ts'

export abstract class BaseShip<T extends IBaseShipOptions> extends Module {
  public options: T
  static readonly SOURCE: string = 'mapbox-gl-ship-source'
  static readonly NAME: string = 'Base'

  visible = true

  protected constructor(map: Map, options: T) {
    super(map)

    this.options = options
  }

  override destroy(): void {
    throw new Error('Method not implemented.')
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  abstract get id(): IBaseShipOptions['id']

  abstract get updateStatus(): UPDATE_STATUS

  abstract position(): IBaseShipOptions['position']

  abstract get direction(): IBaseShipOptions['direction']

  abstract get orientation(): Orientation

  abstract getShape(): Shape | null

  abstract getFeature(): GeoJSON.Feature<GeoJSON.Polygon, T> | GeoJSON.Feature<GeoJSON.Point, T>

  abstract remove(): void

  abstract setTooltip(): void

  abstract update(options: IAisShipOptions): void

  abstract focus(): void

  abstract unfocus(): void

  abstract icon(): GeoJSON.Feature<GeoJSON.Point, T>

  abstract real(): GeoJSON.Feature<GeoJSON.Polygon, T> | GeoJSON.Feature<GeoJSON.Point, T>

  abstract render(): void

  abstract label(): HTMLElement

  abstract offset(): Point

  public setState(states: Record<string, unknown>): void {
    this.context.map.setFeatureState(
      {
        source: BaseShip.SOURCE,
        id: this.id,
      },
      states,
    )
  }

  public getState(): Record<string, unknown> | null | undefined {
    return this.context.map.getFeatureState({
      source: BaseShip.SOURCE,
      id: this.id,
    })
  }

  public isSelf(e: MapMouseEvent): boolean {
    if (e.features && e.features.length > 0) {
      const data = e.features[0]
      return String(data.id) === this.id
    } else {
      return false
    }
  }

  public getName(): string {
    return BaseShip.NAME
  }
}
