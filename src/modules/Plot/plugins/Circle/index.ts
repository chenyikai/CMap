import { bbox, bearing, circle as createCircle, destination, distance } from '@turf/turf'
import type { Feature, Polygon } from 'geojson'
import type { Map } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import {
  CircleCreateEvent,
  CircleResidentEvent,
  CircleUpdateEvent,
} from '@/modules/Plot/plugins/Events/CircleEvents.ts'
import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import { Point } from '@/modules/Plot/plugins/Point'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { ICircleOptions } from '@/types/Plot/Circle.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { PointStyle } from '@/types/Plot/Point.ts'

import { CIRCLE_LAYER_NAME, CIRCLE_META, DEFAULT_FILL_COLOR, LAYER_LIST, NAME } from './vars.ts'

const DEFAULT_UNIT: NonNullable<ICircleOptions['unit']> = 'meters'
const DEFAULT_STEPS = 64
const DEFAULT_BEARING = 90

export class Circle<T extends ICircleOptions = ICircleOptions> extends Poi<T, Polygon | null> {
  static NAME: PlotType = NAME

  override readonly LAYER: string = CIRCLE_LAYER_NAME

  private removed = false
  private radiusBearing = DEFAULT_BEARING

  public centerPoint: Point | null = null
  public radiusPoint: Point | null = null

  public residentEvent: CircleResidentEvent
  public updateEvent: CircleUpdateEvent
  public createEvent: CircleCreateEvent

  constructor(map: Map, options: T) {
    super(map, options)

    try {
      this.options = this.normalizeOptions(options)
    } catch (error) {
      this.detachLifecycle()
      throw error
    }
    this.residentEvent = new CircleResidentEvent(map, this)
    this.updateEvent = new CircleUpdateEvent(map, this)
    this.createEvent = new CircleCreateEvent(map, this)
    this.residentEvent.enabled()
  }

  public override get id(): string {
    return this.options.id
  }

  public override get center(): LngLat | null {
    return this.options.center ?? null
  }

  public get radius(): number | null {
    return this.options.radius ?? null
  }

  public get unit(): NonNullable<ICircleOptions['unit']> {
    return this.options.unit ?? DEFAULT_UNIT
  }

  public override get geometry(): Polygon | null {
    return this.getFeature().geometry
  }

  public override getFeature(): Feature<Polygon | null> {
    if (!this.center || this.radius === null || this.radius <= 0) {
      return {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }
    }

    const feature = createCircle(this.center.toArray(), this.radius, {
      units: this.unit,
      steps: this.options.steps,
      properties: {
        ...this.options.style,
        ...this.options.properties,
        id: this.id,
        meta: CIRCLE_META,
        visibility: this.options.visibility,
      },
    })
    feature.id = this.id
    return feature
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

  public override start(): void {
    if (this.removed || this.geometry) return
    this.updateEvent.disabled()
    this.residentEvent.disabled()
    this.setState({ create: true })
    this.createEvent.enabled()
    this.render()
  }

  public override stop(): void {
    this.createEvent.disabled()
    this.setState({ create: false })
    if (this.visibility === 'visible' && !this.isEdit) this.residentEvent.enabled()
    this.render()
  }

  public override edit(): void {
    if (this.removed) return
    this.createEvent.disabled()
    this.setState({ create: false, edit: true })
    this.residentEvent.disabled()
    this.syncControlPoints()
    if (this.visibility === 'visible') this.updateEvent.enabled()
    this.render()
  }

  public override unedit(): void {
    this.setState({ edit: false })
    this.updateEvent.disabled()
    if (this.visibility === 'visible') this.residentEvent.enabled()
    this.render()
  }

  public override focus(): void {
    this.setState({ focus: true })
    this.render()
  }

  public override unfocus(): void {
    this.setState({ focus: false })
    this.render()
  }

  public override select(): void {
    if (!this.geometry) return
    const bounds = bbox(this.getFeature() as Feature<Polygon>) as [number, number, number, number]
    this.context.map.fitBounds(bounds, {
      padding: { left: 60, right: 60, top: 60, bottom: 60 },
    })
    this.focus()
  }

  public override unselect(): void {
    this.unfocus()
  }

  public override move(position: LngLat): void {
    const reference = this.updateEvent.getDragLngLat() ?? this.center
    if (!reference || !this.center) return
    this.options.center = new LngLat(
      this.center.lng + position.lng - reference.lng,
      this.center.lat + position.lat - reference.lat,
    )
    this.render()
  }

  public setCenter(position: LngLat): void {
    this.assertPosition(position)
    this.options.center = new LngLat(position.lng, position.lat)
    this.render()
  }

  public setRadius(radius: number): void {
    this.assertRadius(radius)
    this.options.radius = radius
    this.render()
  }

  public setRadiusFrom(position: LngLat): void {
    if (!this.center) return
    this.assertPosition(position)
    this.options.radius = distance(this.center.toArray(), position.toArray(), { units: this.unit })
    if (this.options.radius > 0) {
      this.radiusBearing = bearing(this.center.toArray(), position.toArray())
    }
    this.render()
  }

  public override update(options: T): void {
    if (options.id !== this.id) throw new Error('Plot id cannot be changed')
    const normalizedOptions = this.normalizeOptions(options)
    const editing = this.isEdit
    this.updateEvent.disabled()
    this.options = normalizedOptions
    this.syncControlPoints()
    if (editing && this.visibility === 'visible') this.updateEvent.enabled()
    this.render()
  }

  public override show(): void {
    if (this.removed) return
    this.options.visibility = 'visible'
    if (this.isEdit) this.updateEvent.enabled()
    else if (!this.isCreate) this.residentEvent.enabled()
    this.render()
  }

  public override hide(): void {
    this.createEvent.disabled()
    this.updateEvent.disabled()
    this.residentEvent.disabled()
    this.setState({ create: false })
    this.context.focus.remove(this.id)
    this.options.visibility = 'none'
    this.render()
  }

  public override remove(): void {
    if (this.removed) return
    this.createEvent.destroy()
    this.updateEvent.destroy()
    this.residentEvent.destroy()
    this.removeControlPoints()
    this.detachLifecycle()
    this.context.focus.remove(this.id)
    this.context.map.removeFeatureState({ source: this.SOURCE, id: this.id })
    this.removeAllListeners()
    this.context.register.setGeoJSONData(this.SOURCE, {
      type: 'Feature',
      id: this.id,
      geometry: null,
      properties: {},
    })
    this.removed = true
  }

  public override render(): void {
    if (this.removed) return
    this.syncControlPoints()

    const feature = this.getFeature()
    if (this.isFocus && feature.geometry && this.visibility === 'visible') {
      this.context.focus.set(feature as Feature<Polygon>, { armLength: 40, padding: 30 })
    } else {
      this.context.focus.remove(this.id)
    }
    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, feature)
  }

  private normalizeOptions(options: T): T {
    if (!options.id) throw new Error('Circle id is required')
    if (options.center) this.assertPosition(options.center)
    if (options.radius !== undefined) this.assertRadius(options.radius)
    const steps = options.steps ?? DEFAULT_STEPS
    if (!Number.isInteger(steps) || steps < 4) {
      throw new Error('Circle steps must be an integer greater than or equal to 4')
    }
    return {
      ...options,
      center: options.center ? new LngLat(options.center.lng, options.center.lat) : options.center,
      unit: options.unit ?? DEFAULT_UNIT,
      steps,
    }
  }

  private assertPosition(position: LngLat): void {
    if (!Number.isFinite(position.lng) || !Number.isFinite(position.lat)) {
      throw new Error('Invalid circle coordinate')
    }
  }

  private assertRadius(radius: number): void {
    if (!Number.isFinite(radius) || radius < 0) {
      throw new Error('Circle radius must be a finite non-negative number')
    }
  }

  private get radiusPosition(): LngLat | null {
    if (!this.center || this.radius === null) return null
    const point = destination(this.center.toArray(), this.radius, this.radiusBearing, {
      units: this.unit,
    })
    return new LngLat(point.geometry.coordinates[0], point.geometry.coordinates[1])
  }

  private syncControlPoints(): void {
    const center = this.center
    if (!center) {
      this.removeControlPoints()
      return
    }

    const controlVisible =
      this.visibility === 'visible' &&
      (this.isEdit || this.isCreate || this.options.isName === true)
    const centerStyle: PointStyle = {
      'circle-radius': 5,
      'circle-color': '#fff',
      'circle-stroke-color': this.options.style?.['line-color'] ?? DEFAULT_FILL_COLOR,
      'circle-stroke-width': 2,
      ...this.options.centerStyle,
    }
    const centerOptions = {
      id: `${this.id}-center`,
      name: this.options.name,
      isName: this.options.isName,
      position: center,
      visibility: controlVisible ? ('visible' as const) : ('none' as const),
      style: centerStyle,
      properties: { originId: this.id, role: 'center' },
    }
    if (this.centerPoint) this.centerPoint.update(centerOptions)
    else this.centerPoint = new Point(this.context.map, centerOptions)
    this.centerPoint.residentEvent.disabled()

    const radiusPosition = this.radiusPosition
    if (!radiusPosition) {
      this.radiusPoint?.remove()
      this.radiusPoint = null
      return
    }
    const radiusStyle: PointStyle = {
      'circle-radius': 5,
      'circle-color': '#fff',
      'circle-stroke-color': this.options.style?.['line-color'] ?? DEFAULT_FILL_COLOR,
      'circle-stroke-width': 2,
      ...this.options.radiusStyle,
    }
    const radiusOptions = {
      id: `${this.id}-radius`,
      isName: false,
      position: radiusPosition,
      visibility:
        this.visibility === 'visible' && (this.isEdit || this.isCreate) && (this.radius ?? 0) > 0
          ? ('visible' as const)
          : ('none' as const),
      style: radiusStyle,
      properties: { originId: this.id, role: 'radius' },
    }
    if (this.radiusPoint) this.radiusPoint.update(radiusOptions)
    else this.radiusPoint = new Point(this.context.map, radiusOptions)
    this.radiusPoint.residentEvent.disabled()
  }

  private removeControlPoints(): void {
    this.centerPoint?.remove()
    this.radiusPoint?.remove()
    this.centerPoint = null
    this.radiusPoint = null
  }
}
