import type * as GeoJSON from 'geojson'
import { isEmpty } from 'lodash-es'
import type { LayerSpecification, Map as MapboxGlMap, Source, SourceSpecification } from 'mapbox-gl'

class ResourceRegister {
  private map: MapboxGlMap
  private sourceData = new Map<string, GeoJSON.FeatureCollection>()
  private dirtySourceIds = new Set<string>()
  private renderFrameId: number | null = null

  constructor(map: MapboxGlMap) {
    this.map = map
  }

  /**
   * 幂等地添加 Source
   */
  public addSource(id: string, source: SourceSpecification): void {
    if (!this.map.getSource(id)) {
      if (source.type === 'geojson' && !source.promoteId) {
        // source.promoteId = 'id'; // 可选：根据你的数据结构决定是否开启
      }
      this.map.addSource(id, source)
    }
  }

  /**
   * 幂等地添加 Layer
   */
  public addLayer(layer: LayerSpecification, beforeId?: string): void {
    if (!this.map.getLayer(layer.id)) {
      this.map.addLayer(layer, beforeId)
    }
  }

  public findFeature(source: string, featureId: string): GeoJSON.Feature | undefined {
    const data = this.sourceData.get(source)
    return data?.features.find((item) => item.id === featureId)
  }

  /**
   * 获取 Source
   */
  public getSource(id: string): Source | undefined {
    return this.map.getSource(id)
  }

  /**
   * 核心逻辑：更新内存数据 -> 标记为脏 -> 调度渲染
   * 支持增、删、改
   */
  public setGeoJSONData(
    id: string,
    data: GeoJSON.Feature<GeoJSON.Geometry | null> | GeoJSON.Feature<GeoJSON.Geometry | null>[],
  ): void {
    const inputFeatures = Array.isArray(data) ? data : [data]

    let collection = this.sourceData.get(id)
    if (!collection) {
      collection = { type: 'FeatureCollection', features: [] }
      this.sourceData.set(id, collection)
    }

    inputFeatures.forEach((newFeature) => {
      if (isEmpty(newFeature.id)) return

      const existingIndex = collection.features.findIndex((f) => f.id === newFeature.id)

      // === 删除逻辑 (Geometry 为 null) ===
      if (newFeature.geometry === null) {
        if (existingIndex > -1) {
          collection.features.splice(existingIndex, 1)
        }
      } else {
        if (existingIndex > -1) {
          // 替换旧数据
          collection.features[existingIndex] = newFeature as GeoJSON.Feature
        } else {
          // 追加新数据
          collection.features.push(newFeature as GeoJSON.Feature)
        }
      }
    })

    this.dirtySourceIds.add(id)

    this.scheduleRender()
  }

  // /**
  //  * 兼容 updateGeoJSONData 接口
  //  * 内部依然走 setGeoJSONData 的统一管道，确保数据一致性，防止闪烁
  //  */
  // public updateGeoJSONData(id: string, data: GeoJSON.GeoJSON<GeoJSON.Geometry | null>): void {
  //   // 场景 A: 传入的是 FeatureCollection -> 全量替换内存数据
  //   if (data.type === 'FeatureCollection') {
  //     // 过滤掉 geometry 为 null 的无效数据（防御性编程）
  //     const validFeatures = (data.features || []).filter(
  //       (f) => f.geometry !== null,
  //     ) as GeoJSON.Feature[]
  //
  //     this.sourceData.set(id, {
  //       ...data,
  //       features: validFeatures,
  //     } as GeoJSON.FeatureCollection)
  //
  //     this.dirtySourceIds.add(id)
  //     this.scheduleRender()
  //     return
  //   }
  //
  //   // 场景 B: 传入的是 Feature -> 复用增量逻辑
  //   if (data.type === 'Feature') {
  //     this.setGeoJSONData(id, data as GeoJSON.Feature<GeoJSON.Geometry | null>)
  //     return
  //   }
  //
  //   console.warn(`[ResourceRegister] Unsupported GeoJSON type: ${data.type}`)
  // }

  /**
   * 调度器：利用 requestAnimationFrame 防抖
   */
  private scheduleRender(): void {
    if (this.renderFrameId !== null) return

    this.renderFrameId = requestAnimationFrame(() => {
      this.flushUpdates()
      this.renderFrameId = null
    })
  }

  /**
   * 执行器：真正调用 Mapbox API
   */
  private flushUpdates(): void {
    this.dirtySourceIds.forEach((id) => {
      const source = this.getSource(id)
      const collection = this.sourceData.get(id)

      if (source?.type === 'geojson' && collection) {
        source.setData({
          ...collection,
          features: [...collection.features],
        })
      }
    })

    this.dirtySourceIds.clear()
  }

  public setState(source: string, id: string, states: Record<string, unknown>): void {
    this.map.setFeatureState(
      {
        source,
        id,
      },
      states,
    )
  }

  public getState(source: string, id: string): Record<string, unknown> | null | undefined {
    return this.map.getFeatureState({
      source,
      id,
    })
  }

  /**
   * 销毁清理
   */
  public destroy(): void {
    if (this.renderFrameId !== null) {
      cancelAnimationFrame(this.renderFrameId)
      this.renderFrameId = null
    }
    this.sourceData.clear()
    this.dirtySourceIds.clear()
  }
}

export default ResourceRegister
