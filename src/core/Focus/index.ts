import { bbox, multiLineString } from '@turf/turf'
import EventEmitter from 'eventemitter3'
import type { BBox, Feature, MultiLineString } from 'geojson'
import { set } from 'lodash-es'
import type { GeoJSONSource } from 'mapbox-gl'
import type { Map } from 'mapbox-gl'
import { v4 } from 'uuid'

import ResourceRegister from '@/core/ResourceRegister'
import type { FocusItem, IFocusOptions } from '@/types/Focus'
import { distanceToPx } from '@/utils/util.ts'

import { FOCUS_LAYER, FOCUS_SOURCE_NAME } from './vars.ts'

class Focus extends EventEmitter {
  private readonly map: Map
  focusItems: FocusItem[] = []
  private register: ResourceRegister

  zoomendFunc = this._zoomend.bind(this)

  constructor(map: Map) {
    super()

    this.map = map
    this.register = new ResourceRegister(map)
    this.onAdd()
  }

  get features(): FocusItem['feature'][] {
    return this.focusItems.map((item) => item.border)
  }

  onAdd(): void {
    this.register.addSource(FOCUS_SOURCE_NAME, {
      type: 'geojson',
      dynamic: true,
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    this.register.addLayer(FOCUS_LAYER)
  }
  onRemove(): void {
    this.removeAll()
  }

  set(feature: Feature, options?: IFocusOptions): string | number {
    const uuid = feature.id ?? v4()

    this._onHandle(uuid, feature, options)

    return uuid
  }

  get(id: string): FocusItem | undefined {
    return this.focusItems.find((item) => item.id === id)
  }

  remove(id: string): void {
    const i = this.focusItems.findIndex((item) => item.id === id)
    if (i !== -1) {
      this.focusItems.splice(i, 1)
    }
    this.render()
  }

  removeAll(): void {
    this.focusItems = []
    this.render()
  }

  render(): void {
    const source = this.map.getSource<GeoJSONSource>(FOCUS_SOURCE_NAME)

    if (source) {
      if (this.features.length > 0) {
        source.updateData({
          type: 'FeatureCollection',
          features: this.features,
        })
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: this.features,
        })
      }
    }
  }

  private _zoomend(): void {
    // this.focusItems.forEach((item) => {
    //   this.set(item.feature, { ...item.options, id: item.id })
    // })

    this.render()
  }

  private _onHandle(uuid: string | number, feature: Feature, options?: IFocusOptions): void {
    const border = this.getFocusBorder(feature, options)
    const item: FocusItem = { id: uuid, border, feature, options }

    const i = this.focusItems.findIndex((item) => item.id === uuid)
    if (i !== -1) {
      set(this.focusItems, i, item)
    } else {
      this.focusItems.push(item)
    }

    this.render()

    if (this.features.length > 0) {
      this.map.on('zoomend', this.zoomendFunc)
    } else {
      this.map.off('zoomend', this.zoomendFunc)
    }
  }

  /**
   * 通用聚焦边框生成方法
   * @param feature 目标要素 (Point | LineString | Polygon)
   * @param options 配置项
   * @returns 聚焦框 Feature
   */
  public getFocusBorder(
    feature: Feature,
    options: IFocusOptions = {},
  ): Feature<MultiLineString, { id: string }> {
    const id = String(feature.id ?? v4())
    const { padding = 10, armLength = 20, size = 40 } = options

    // 1. 计算原始 BBox
    // 如果是 Point，bbox 是一个点；如果是 Line/Poly，是外包矩形
    const rawBBox = bbox(feature) // [minLng, minLat, maxLng, maxLat]

    // 2. 准备计算参数
    // 计算当前缩放级别下，1 像素代表多少米 (用于像素 -> 地理坐标转换)
    // distanceToPx(map, 1) 返回的是 1米多少像素，取倒数就是 1像素多少米
    const metersPerPixel = 1 / distanceToPx(this.map, 1)

    // 3. 差异化处理
    let finalBBox = rawBBox
    let finalArmLengthMeters = 0

    if (feature.geometry.type === 'Point') {
      // === Point 逻辑 ===
      // 主要是基于 icon size 向外扩张
      // 假设 pointSize 是图标宽/高，padding 是额外留白
      const halfSizePx = size / 2
      const expandMeters = halfSizePx * metersPerPixel

      // 计算手臂长度：保持你原来的比例 (size * 0.3)
      finalArmLengthMeters = size * 0.3 * metersPerPixel

      // 扩展 BBox (中心点向四周扩散)
      finalBBox = this._expandBBox(rawBBox, expandMeters, rawBBox[1])
    } else {
      // === LineString / Polygon 逻辑 ===
      // 基于几何体 BBox，加上固定的 Padding
      const paddingMeters = padding * metersPerPixel

      // 手臂长度：使用固定的像素长度 (防止大物体出现巨大手臂)
      // 同时做一个限制：手臂不能超过边长的一半，否则四个角会这就连在一起了
      // 简单起见，这里先用固定长度
      finalArmLengthMeters = armLength * metersPerPixel

      // 扩展 BBox
      finalBBox = this._expandBBox(rawBBox, paddingMeters, rawBBox[1])
    }

    // 4. 调用核心绘制逻辑
    return this._createBracketGeometry(id, finalBBox, finalArmLengthMeters)
  }

  /**
   * 辅助：向外扩展 BBox (米 -> 经纬度)
   */
  private _expandBBox(rawBBox: number[], expandMeters: number, baseLat: number): BBox {
    const [minLng, minLat, maxLng, maxLat] = rawBBox

    const METERS_PER_DEGREE_LAT = 111319
    const dLat = expandMeters / METERS_PER_DEGREE_LAT
    const dLng = dLat / Math.cos((baseLat * Math.PI) / 180)

    return [minLng - dLng, minLat - dLat, maxLng + dLng, maxLat + dLat]
  }

  /**
   * 核心绘制：根据 BBox 和 手臂物理长度 生成括号坐标
   * (这是你原来那个方法的纯净版，去掉了业务逻辑，只负责画图)
   */
  private _createBracketGeometry(
    id: string,
    bbox: number[],
    armLengthMeters: number,
  ): Feature<MultiLineString, { id: string }> {
    const [minLng, minLat, maxLng, maxLat] = bbox

    // 经纬度转换
    const METERS_PER_DEGREE_LAT = 111319
    const dLat = armLengthMeters / METERS_PER_DEGREE_LAT
    const latRad = (minLat * Math.PI) / 180
    const dLng = dLat / Math.cos(latRad)

    // 限制手臂长度，防止重叠 (可选优化)
    // 如果 BBox 特别小，dLat 可能大于高度的一半
    const actualDLat = Math.min(dLat, (maxLat - minLat) / 2)
    const actualDLng = Math.min(dLng, (maxLng - minLng) / 2)

    const coordinates = [
      // 左下角 (BL)
      [
        [minLng + actualDLng, minLat],
        [minLng, minLat],
        [minLng, minLat + actualDLat],
      ],
      // 左上角 (TL)
      [
        [minLng, maxLat - actualDLat],
        [minLng, maxLat],
        [minLng + actualDLng, maxLat],
      ],
      // 右上角 (TR)
      [
        [maxLng - actualDLng, maxLat],
        [maxLng, maxLat],
        [maxLng, maxLat - actualDLat],
      ],
      // 右下角 (BR)
      [
        [maxLng, minLat + actualDLat],
        [maxLng, minLat],
        [maxLng - actualDLng, minLat],
      ],
    ]

    return multiLineString(coordinates, { id }, { id })
  }
}

export default Focus
