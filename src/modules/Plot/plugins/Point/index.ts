import { point } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import { LngLat, type LngLatLike, type Map } from 'mapbox-gl'

import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import {
  DEFAULT_CIRCLE_RADIUS,
  DEFAULT_CIRCLE_STROKE_WIDTH,
  DEFAULT_TEXT_SIZE,
  GAP_PX,
  LAYER_LIST,
  NAME,
  POINT_CIRCLE_LAYER_NAME,
} from '@/modules/Plot/plugins/Point/vars.ts'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { CalcOffsetParams } from '@/types/Plot/IconPoint.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { IPointOptions } from '@/types/Plot/Point.ts'

import { PointCreateEvent, PointResidentEvent, PointUpdateEvent } from '../Events/PointEvents'

function normalizeOptions<T extends IPointOptions>(options: T): T {
  return {
    ...options,
    position: options.position == null ? undefined : LngLat.convert(options.position),
  }
}

export class Point<T extends IPointOptions = IPointOptions> extends Poi<T, GeoJSON.Point | null> {
  static NAME: PlotType = NAME

  override readonly LAYER: string = POINT_CIRCLE_LAYER_NAME

  protected removed = false

  public residentEvent: PointResidentEvent<this>

  public updateEvent: PointUpdateEvent<this>

  public createEvent: PointCreateEvent<this>

  constructor(map: Map, options: T) {
    super(map, normalizeOptions(options))

    this.residentEvent = new PointResidentEvent(map, this)
    this.updateEvent = new PointUpdateEvent(map, this)
    this.createEvent = new PointCreateEvent(map, this)
    if (new.target === Point) {
      this.syncInteractionState()
    } else {
      // Custom subclasses may initialize their layer after super() returns.
      queueMicrotask(() => {
        if (!this.removed && !this.isEdit && !this.isCreate && this.visibility === 'visible') {
          this.syncInteractionState()
        }
      })
    }
  }

  public override onAdd(): void {
    this.context.register.addSource(PLOT_SOURCE_NAME, EMPTY_SOURCE)

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })
  }
  public override onRemove(): void {
    this.remove()
  }

  public override get id(): string {
    return this.options.id
  }
  public override edit(): void {
    if (this.removed) return
    this.setState({ create: false, edit: true })
    this.syncInteractionState()
  }
  public override unedit(): void {
    this.setState({ edit: false })
    this.syncInteractionState()
  }

  public override hide(): void {
    if (this.removed) return
    this.options.visibility = 'none'
    this.setState({ create: false, hover: false })
    this.syncInteractionState()
    this.context.focus.remove(this.id)
    this.render()
  }

  public override show(): void {
    if (this.removed) return
    this.options.visibility = 'visible'
    this.syncInteractionState()
    this.render()
  }

  public override focus(): void {
    this.setState({ focus: true })
    this.render()
  }
  public override unfocus(): void {
    this.setState({ focus: false })
    this.context.focus.remove(this.id)
  }
  public override select(): void {
    if (!this.center) return
    this.context.map.easeTo({ center: this.center })
    this.focus()
  }
  public override unselect(): void {
    this.unfocus()
  }

  public override get center(): LngLat | null {
    if (!this.options.position) return null

    return LngLat.convert(this.options.position)
  }

  public override get geometry(): GeoJSON.Point | null {
    return this.getFeature().geometry
  }

  public override getFeature(): GeoJSON.Feature<GeoJSON.Point | null> {
    const position = this.center
    if (!position) {
      // const emptyFeature: GeoJSON.Feature<null, T['style'] & T['properties']> = {
      //   type: 'Feature',
      //   geometry: null,
      //   id: this.id,
      //   properties: {},
      // }

      return {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }
    }

    const h = (DEFAULT_CIRCLE_RADIUS + DEFAULT_CIRCLE_STROKE_WIDTH) * 2
    const scale = 1
    const anchor = 'center'

    const calculatedOffset = this.calculateTextOffset({
      iconHeight: h,
      iconScale: scale,
      iconAnchor: anchor,
      textSize: DEFAULT_TEXT_SIZE,
      gap: GAP_PX,
    })

    return point(
      position.toArray(),
      {
        ...this.options.style,
        ...this.options.properties,
        id: this.options.id,
        visibility: this.options.visibility,
        isName: this.options.isName,
        text: this.options.name,
        _calcTextOffset: calculatedOffset,
        meta: 'circle',
      },
      {
        id: this.options.id,
      },
    )
  }
  public override start(): void {
    if (this.center === null) {
      this.setState({ create: true, edit: false })
      this.syncInteractionState()
    }
  }
  public override stop(): void {
    this.setState({ create: false })
    this.syncInteractionState()
  }

  public override move(position: LngLatLike): void {
    this.options.position = LngLat.convert(position)
    this.render()
  }
  public override update(options: T): void {
    if (options.id !== this.id) throw new Error('Plot id cannot be changed')
    this.options = normalizeOptions(options)
    this.syncInteractionState()
    this.render()
  }
  public override remove(): void {
    if (this.removed) return
    this.removed = true
    this.detachLifecycle()
    this.residentEvent.destroy()
    this.updateEvent.destroy()
    this.createEvent.destroy()
    this.context.focus.remove(this.id)
    this.context.map.removeFeatureState({ source: this.SOURCE, id: this.id })

    this.removeAllListeners()

    const emptyFeature: GeoJSON.Feature<null> = {
      type: 'Feature',
      geometry: null,
      id: this.id,
      properties: {},
    }

    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, emptyFeature)
  }
  public override render(): void {
    if (this.removed) return
    const feature = this.getFeature()
    if (this.isFocus && feature.geometry && this.visibility === 'visible') {
      this.context.focus.set(feature as GeoJSON.Feature)
    } else {
      this.context.focus.remove(this.id)
    }
    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, feature as GeoJSON.Feature)
  }

  protected syncInteractionState(): void {
    if (this.removed || this.visibility !== 'visible') {
      this.createEvent.disabled()
      this.updateEvent.disabled()
      this.residentEvent.disabled()
      return
    }

    if (this.isCreate) {
      this.createEvent.enabled()
      this.updateEvent.disabled()
      this.residentEvent.disabled()
    } else if (this.isEdit) {
      this.createEvent.disabled()
      this.updateEvent.enabled()
      this.residentEvent.disabled()
    } else {
      this.createEvent.disabled()
      this.updateEvent.disabled()
      this.residentEvent.enabled()
    }
  }

  /**
   * 计算文字相对于图标的偏移量
   * 返回单位为 em (Mapbox text-offset 标准单位)
   */
  protected calculateTextOffset(params: CalcOffsetParams): [number, number] {
    const { iconHeight, iconScale = 1, iconAnchor = 'bottom', textSize = 12, gap = GAP_PX } = params

    // 1. 计算图标在屏幕上的实际像素高度
    const actualHeight = iconHeight * iconScale

    // 2. 计算需要的垂直偏移像素 (Pixel)
    let offsetY_px = 0

    // 根据锚点判断图标占据了坐标点下方多少空间
    if (iconAnchor.includes('bottom')) {
      // A. 底部对齐 (bottom, bottom-left, bottom-right)
      // 图标在坐标点上方，完全不挡路，只需要加个间距
      offsetY_px = gap
    } else if (iconAnchor.includes('top')) {
      // B. 顶部对齐 (top, top-left, top-right)
      // 图标挂在坐标点下方，文字要躲开整个图标的高度
      offsetY_px = actualHeight + gap
    } else {
      // C. 居中对齐 (center, left, right)
      // 图标跨越坐标点，文字要躲开半个图标的高度
      offsetY_px = actualHeight / 2 + gap
    }

    // 3. 转换为 em 单位 (Mapbox 要求)
    // 公式: 像素 / 字体大小
    const offsetY_em = offsetY_px / textSize

    // 返回 [x, y]，这里我们只处理垂直偏移
    return [0, offsetY_em]
  }
}
