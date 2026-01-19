import EventEmitter from 'eventemitter3'
import { Map } from 'mapbox-gl'

import IconManager from '@/core/IconManager'
import { SHIP_ICON, UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { ICMapOptions } from '@/types/CMap'
import { MapType } from '@/types/CMap'
import type { SvgIcon } from '@/types/IconManager'

import { landStyle } from './vars.ts'

export class CMap extends EventEmitter {
  public readonly map: Map
  private readonly options: ICMapOptions
  private cache = new Set<(map: Map) => void>()
  private timer: number | null = null
  private readonly originalRemove: () => void

  readonly icon: IconManager

  static LAND: MapType = MapType.LAND
  static SATELLITE: MapType = MapType.SATELLITE

  constructor(options: ICMapOptions) {
    super()

    // if (options.type === CMap.LAND) {
    //   this.options = {
    //     ...options,
    //     style: landStyle,
    //   }
    // }
    this.options = options
    Map.prototype._authenticate = (): void => {
      /* empty */
    }

    this.map = new Map({ ...this.options, style: landStyle })
    this.icon = new IconManager(this.map)

    this.originalRemove = this.map.remove.bind(this.map)

    this.map.remove = (): void => {
      this.map.fire('beforeRemove', {
        cancel: (isCancel: boolean) => {
          if (!isCancel) {
            this.originalRemove()
          }
        },
      })
    }

    this.map.once('load', () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      SHIP_ICON.forEach(async (icon: SvgIcon) => {
        await Promise.all([
          this.icon.addSvg({
            name: icon.name.replace('$color', UPDATE_STATUS.ONLINE),
            svg: icon.svg.replace('$color', `#03CC02`),
          }),
          this.icon.addSvg({
            name: icon.name.replace('$color', UPDATE_STATUS.DELAY),
            svg: icon.svg.replace('$color', `#FFFD6C`),
          }),
          this.icon.addSvg({
            name: icon.name.replace('$color', UPDATE_STATUS.OFFLINE),
            svg: icon.svg.replace('$color', `#999999`),
          }),
        ])
      })
      this.emit('loaded', this.map)
    })
  }

  getMap(): Map {
    return this.map
  }

  zoomIn(): void {
    if (!this.getMap().isZooming()) {
      this.getMap().zoomIn()
    }
  }

  zoomOut(): void {
    if (!this.getMap().isZooming()) {
      this.getMap().zoomOut()
    }
  }

  mapLoaded(): Promise<Map> {
    const load = (resolve: (mao: Map) => void): void => {
      if (!this.getMap()._loaded) {
        if (!this.timer) {
          this.timer = setInterval(() => {
            load(resolve)
          }, 16) as unknown as number
        } else {
          this.cache.add(resolve)
        }
      } else {
        if (this.timer) {
          clearInterval(this.timer)
          this.timer = null
        }
        if (this.cache.size > 0) {
          this.cache.forEach((cb): void => {
            cb(this.getMap())
          })
          this.cache.clear()
        }

        resolve(this.getMap())
      }
    }

    return new Promise((resolve, reject) => {
      try {
        load(resolve)
      } catch (e) {
        if (this.timer) {
          clearInterval(this.timer)
          this.timer = null
        }

        reject(new Error(`mapLoaded错误:${e as string}`))
      }
    })
  }
}
