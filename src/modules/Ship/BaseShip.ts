import type * as GeoJSON from 'geojson'
import type { Map, MapMouseEvent, Point } from 'mapbox-gl'

import { Module } from '@/core/Module'
import type { Tooltip } from '@/core/Tooltip'
import type { UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'
import type { IBaseShipOptions, Orientation, Shape } from '@/types/Ship/BaseShip.ts'

export abstract class BaseShip<T extends IBaseShipOptions> extends Module {
  public options: T
  readonly SOURCE: string = 'mapbox-gl-ship-source'
  readonly NAME: string = 'Base'

  public tooltip: Tooltip | null = null

  visible = true

  protected constructor(map: Map, options: T) {
    super(map)

    this.options = options
  }

  override destroy(): void {
    throw new Error('Method not implemented.')
  }
  get isFocus(): boolean {
    const state = this.getState()
    if (state) {
      return !!state.focus
    } else {
      return false
    }
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  abstract get id(): IBaseShipOptions['id']

  abstract get updateStatus(): UPDATE_STATUS

  abstract getIconName(): string

  abstract position(): IBaseShipOptions['position']

  abstract get direction(): IBaseShipOptions['direction']

  abstract get orientation(): Orientation

  abstract getShape(): Shape | null

  abstract getFeature(): GeoJSON.Feature<GeoJSON.Polygon, T> | GeoJSON.Feature<GeoJSON.Point, T>

  abstract remove(): void

  abstract setTooltip(tooltip: Tooltip): void

  abstract update(options: IAisShipOptions): void

  abstract select(): void

  abstract unselect(): void

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
        source: this.SOURCE,
        id: this.id,
      },
      states,
    )
  }

  public getState(): Record<string, unknown> | null | undefined {
    return this.context.map.getFeatureState({
      source: this.SOURCE,
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
    return this.NAME
  }
}
