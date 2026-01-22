import { lineString, lineToPolygon, point, transformRotate } from '@turf/turf'
import dayjs from 'dayjs'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'
import { Point } from 'mapbox-gl'

import { Tooltip } from '@/core/Tooltip/index.ts'
import { BaseShip } from '@/modules/Ship/BaseShip.ts'
import { LAYER_LIST, NAME, SHIP_SOURCE_NAME, UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'
import type { Orientation, Shape } from '@/types/Ship/BaseShip'
import { distanceToPx } from '@/utils/util.ts'

export class AisShip extends BaseShip<IAisShipOptions> {
  override readonly SOURCE: string = SHIP_SOURCE_NAME
  override readonly NAME: string = NAME

  public tooltip: Tooltip | null = null

  constructor(map: Map, options: IAisShipOptions) {
    super(map, options)

    if (this.options.tooltip) {
      this.setTooltip(
        new Tooltip(this.context.map, {
          id: this.id,
          position: this.position(),
          className: 'mapbox-gl-ship-name-tooltip',
          offsetX: 5,
          offsetY: 25,
          element: this.label(),
          anchor: 'bottom-right',
          visible: true,
        }),
      )

      this.render()
    }
  }

  public override onAdd(): void {
    this.context.register.addSource(SHIP_SOURCE_NAME, {
      type: 'geojson',
      dynamic: true,
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })

    // SHIP_ICON.forEach((icon) => this.context.iconManage.addSvg(icon))
    // await this.context.iconManage.load(SHIP_ICON)
  }
  public override onRemove(): void {
    throw new Error('Method not implemented.')
  }

  override get id(): string | number {
    return this.options.id
  }

  override get updateStatus(): UPDATE_STATUS {
    const betweenTime = Date.now() - dayjs(Number(this.options.time)).valueOf()
    if (betweenTime <= 1800000) {
      return UPDATE_STATUS.ONLINE
    } else if (betweenTime > 1800000 && betweenTime <= 7200000) {
      return UPDATE_STATUS.DELAY
    } else if (betweenTime > 7200000) {
      return UPDATE_STATUS.OFFLINE
    } else {
      return UPDATE_STATUS.OFFLINE
    }
  }

  public override getIconName(): string {
    const state = this.getState()
    let icon = null

    if (this.options.icon) {
      icon = this.options.icon
    } else {
      icon = `${this.NAME}-${this.updateStatus}-${this.orientation}`

      if (state?.hover || state?.focus) {
        icon = `${icon}-active`
      }
    }

    return icon
  }

  override position(): LngLat {
    const orientation: Point = this.context.map.project(this.options.position)
    const x = orientation.x + this.offset().x
    const y = orientation.y + this.offset().y
    return this.context.map.unproject(new Point(x, y))
  }
  override get direction(): number {
    if (this.options.hdg && this.options.hdg >= 0 && this.options.hdg < 360) {
      if (
        this.options.statusId === 0 ||
        this.options.statusId === 7 ||
        this.options.statusId === 8
      ) {
        if (this.options.speed <= 0.5) {
          return this.options.hdg || this.options.cog || 0
        } else {
          if (Math.abs(this.options.hdg - this.options.cog) > 30) {
            return this.options.cog
          }
          return this.options.cog || this.options.hdg || 0
        }
      } else {
        return this.options.hdg || this.options.cog || 0
      }
    } else {
      return this.options.cog || 0
    }
  }

  override get orientation(): Orientation {
    let _rateOfTurn = 0
    if (this.options.rot > 180) {
      _rateOfTurn = this.options.rot - 180
    }
    if (this.options.rot < -180) {
      _rateOfTurn = this.options.rot + 180
    }

    if (this.options.speed === 0 || !this.options.speed) return 'static'
    if (_rateOfTurn === -128.0) return 'static' //-128为特殊值，无转向
    if (_rateOfTurn < 0 && _rateOfTurn > -180) return 'left' //0到-180 左转，-127为每30秒5度以上右转
    if (_rateOfTurn > 0 && _rateOfTurn <= 180) return 'right' //0到 180 右转，127为每30秒5度以上左转
    if (_rateOfTurn === 0) return 'straight'

    return 'static'
  }

  override getShape(): Shape | null {
    if (this.options.width && this.options.height) {
      const { x, y }: Point = this.context.map.project(this.position())
      const ex: number = distanceToPx(this.context.map, this.options.width) / 2
      const ey: number = distanceToPx(this.context.map, this.options.height) / 2

      return {
        leftDirection: new Point(x - ex, y - ey * 2),
        rightDirection: new Point(x + ex, y - ey * 2),
        turn: new Point(x, y - ey * 2),
        head: new Point(x, y - ey),
        rightBow: new Point(x + ex, y - ey * 0.5),
        rightQuarter: new Point(x + ex, y + ey * 0.85),
        rightStern: new Point(x + ex * 0.7, y + ey),
        leftStern: new Point(x - ex * 0.7, y + ey),
        leftQuarter: new Point(x - ex, y + ey * 0.85),
        leftBow: new Point(x - ex, y - ey * 0.5),
      }
    } else {
      return null
    }
  }
  override getFeature():
    | GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions>
    | GeoJSON.Feature<GeoJSON.Point, IAisShipOptions> {
    const zoom = this.options.realZoom ?? 16

    return this.context.map.getZoom() >= zoom ? this.real() : this.icon()
  }
  override remove(): void {
    this.tooltip?.remove()

    const emptyFeature: GeoJSON.Feature<null> = {
      type: 'Feature',
      geometry: null,
      id: this.id,
      properties: {},
    }
    this.context.register.updateGeoJSONData(this.SOURCE, emptyFeature)
  }
  override setTooltip(tooltip: Tooltip): void {
    this.tooltip = tooltip
  }

  override update(options: IAisShipOptions): void {
    this.options = options
    this.render()
  }

  override select(): void {
    this.context.map.flyTo({
      center: this.position(),
      zoom: 16,
    })

    this.context.map.once('moveend', () => {
      this.focus()
    })
  }
  override unselect(): void {
    this.unfocus()
  }

  override focus(): void {
    this.setState({ focus: true })

    this.render()
  }
  override unfocus(): void {
    this.setState({ focus: false })

    this.render()
  }
  override icon(): GeoJSON.Feature<GeoJSON.Point, IAisShipOptions> {
    return point<IAisShipOptions>(
      this.position().toArray(),
      {
        ...this.options,
        icon: this.getIconName(),
        direction: this.direction,
        updateStatus: this.updateStatus,
      },
      {
        id: this.id,
      },
    )
  }
  override real():
    | GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions>
    | GeoJSON.Feature<GeoJSON.Point, IAisShipOptions> {
    const shape = this.getShape()

    if (!shape) {
      return this.icon()
    } else {
      const {
        head,
        rightBow,
        rightQuarter,
        rightStern,
        leftStern,
        leftQuarter,
        leftBow,
        leftDirection,
        rightDirection,
        turn,
      } = shape
      let points: Point[] = [
        head,
        rightBow,
        rightQuarter,
        rightStern,
        leftStern,
        leftQuarter,
        leftBow,
        head,
      ]

      if (this.orientation === 'left') {
        points = [leftDirection, turn, ...points, turn, leftDirection]
      } else if (this.orientation === 'right') {
        points = [rightDirection, turn, ...points, turn, rightDirection]
      } else if (this.orientation === 'straight') {
        points = [turn, ...points, turn]
      }

      const line: GeoJSON.Feature<GeoJSON.LineString, IAisShipOptions> =
        lineString<IAisShipOptions>(
          points.map((item) => this.context.map.unproject(item).toArray()),
        )

      let ship: GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions> = lineToPolygon(line, {
        properties: {
          ...this.options,
          updateStatus: this.updateStatus,
          outLine: true,
        },
      }) as GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions>

      ship = transformRotate<GeoJSON.Feature<GeoJSON.Polygon>>(ship, this.direction, {
        pivot: this.position().toArray(),
      }) as GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions>

      ship.id = this.id
      return ship
    }
  }

  override render(): void {
    this.tooltip?.setLngLat(this.position())
    this.tooltip?.render()

    this.context.register.updateGeoJSONData(this.SOURCE, this.getFeature())

    if (this.isFocus) {
      const icon = this.context.iconManage.getImage(this.getIconName())
      this.context.focus.set(this.getFeature(), {
        size: icon?.width,
        armLength: 10,
        padding: 10,
      })
    }
  }
  override label(): HTMLElement {
    const id = `${String(this.id)}-ship-name-box`
    let shipNameBox = document.getElementById(id)
    if (shipNameBox) {
      return shipNameBox
    }

    shipNameBox = document.createElement('div')
    shipNameBox.id = id
    shipNameBox.classList.add('ship-name-box')

    const shipName = document.createElement('div')
    shipName.innerText = this.options.name
    shipName.classList.add('ship-name')

    shipNameBox.appendChild(shipName)

    return shipNameBox
  }
  override offset(): Point {
    const offset = new Point(0, 0)

    if (this.options.top && this.options.bottom && this.options.left && this.options.right) {
      const ey = distanceToPx(
        this.context.map,
        Math.abs(this.options.top - this.options.bottom) / 2,
      )
      const ex = distanceToPx(
        this.context.map,
        Math.abs(this.options.left - this.options.right) / 2,
      )

      offset.x = this.options.right > this.options.left ? ex : -ex
      offset.y = this.options.top > this.options.bottom ? ey : -ey
    }

    return offset
  }
}
