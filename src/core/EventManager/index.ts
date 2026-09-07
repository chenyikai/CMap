import type { Map as MapboxMap, MapEventType, MapMouseEvent } from 'mapbox-gl'

import type { EventHandler } from '@/types/EventManager'

// 内部存储结构：FeatureId (统一强转为 string) -> EventType -> Callback[]
type ListenerRegistry = Map<string, Map<string, EventHandler[]>>

export class EventManager {
  private map: MapboxMap

  // 业务回调注册表
  private listeners: ListenerRegistry = new Map()

  // 记录底层已注册的监听器，防止重复绑定: "layerId:eventType" -> Handler
  private activeLayerListeners = new Map<string, (e: any) => void>()

  // 记录当前鼠标悬停的 Feature ID，按 layerId 分开记录，支持多图层同时 hover
  private currentHoverIdByLayer = new Map<string, string>()

  constructor(map: MapboxMap) {
    this.map = map
  }

  /**
   * 注册事件监听
   * @param id 实例/Feature 的 ID
   * @param layerId Mapbox 图层 ID
   * @param eventType 事件类型 (click, mouseenter, contextmenu 等)
   * @param callback 回调函数
   */
  public on(
    id: string | number,
    layerId: string,
    eventType: MapEventType,
    callback: EventHandler,
  ): void {
    // 🌟 修复核心1：强制转换为 String 键值，避免数字与字符串引起的 Map 查找失败
    const key = String(id)

    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Map())
    }
    const instanceEvents = this.listeners.get(key)

    if (!instanceEvents) {
      console.error('未找到listener')
      return
    }

    if (!instanceEvents.has(eventType)) {
      instanceEvents.set(eventType, [])
    }

    const callbacks = instanceEvents.get(eventType)

    if (!callbacks) {
      return
    }

    if (!callbacks.includes(callback)) callbacks.push(callback)

    // 确保底层 Mapbox 监听已激活
    this.ensureMapListener(layerId, eventType)
  }

  /**
   * 移除事件监听
   * @param id 实例 ID
   * @param eventType (可选) 事件类型，不传则移除该 ID 所有事件
   * @param callback (可选) 指定回调，不传则移除该类型所有回调
   */
  public off(id: string | number, eventType?: MapEventType, callback?: EventHandler): void {
    const key = String(id)
    const instanceEvents = this.listeners.get(key)
    if (!instanceEvents) return

    // 情况 A: 移除该 ID 的所有监听
    if (!eventType) {
      this.listeners.delete(key)
      return
    }

    const callbacks = instanceEvents.get(eventType)
    if (!callbacks) return

    // 情况 B: 移除该 ID 下某类型的所有监听
    if (!callback) {
      instanceEvents.delete(eventType)
      return
    }

    // 情况 C: 移除特定回调
    const idx = callbacks.indexOf(callback)
    if (idx !== -1) {
      callbacks.splice(idx, 1)
    }

    // 清理空 Map
    if (callbacks.length === 0) instanceEvents.delete(eventType)
    if (instanceEvents.size === 0) this.listeners.delete(key)
  }

  /**
   * 确保 Mapbox 底层对该图层的该事件进行了监听
   */
  private ensureMapListener(layerId: string, eventType: MapEventType): void {
    const key = `${layerId}:${eventType}`

    if (this.activeLayerListeners.has(key)) return

    // 定义底层通用的分发器
    const handler = (e: MapMouseEvent): void => {
      this.dispatch(e, layerId, eventType)
    }

    // @ts-expect-error mapbox-gl types mismatch
    this.map.on(eventType, layerId, handler)
    this.activeLayerListeners.set(key, handler)

    // mouseleave 依赖 mouseenter 记录 hover 状态，需确保 mouseenter 底层监听也已激活
    if (eventType === 'mouseleave') {
      this.ensureMapListener(layerId, 'mouseenter' as MapEventType)
    }
  }

  /**
   * 核心分发逻辑
   */
  private dispatch(e: MapMouseEvent, layerId: string, eventType: MapEventType): void {
    let targetId: string | undefined

    if (eventType === 'mouseleave') {
      // mouseleave 无 features，从按图层记录的 hover 状态中取 ID
      const hoverId = this.currentHoverIdByLayer.get(layerId)
      if (hoverId !== undefined) {
        targetId = hoverId
        this.currentHoverIdByLayer.delete(layerId)
      }
    } else {
      // 对于 click, mouseenter 等，从事件中获取 ID
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]

        // 优先读取 properties.id：
        // 因为 ResourceRegister 对所有 GeoJSON source 自动注入了 promoteId: 'id'，
        // Mapbox 会用 properties.id 替换顶级 feature.id。
        // 顶级 feature.id 在 promoteId 模式下可能为 undefined，所以 properties.id 是唯一可靠来源。
        // ⚠️ 如果你的 feature 没有 properties.id，事件将无法分发！请确保数据侧同步设置 properties.id。
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const rawId = feature.properties?.id ?? feature.id

        if (rawId !== undefined && rawId !== null) {
          targetId = String(rawId)
        }
      }
    }

    if (targetId === undefined) return

    // 特殊处理 mouseenter：按图层记录当前 hover ID
    if (eventType === 'mouseenter') {
      this.currentHoverIdByLayer.set(layerId, targetId)
    }

    // 查找并执行业务层注入的回调（使用快照迭代，防止回调内部修改数组导致的问题）
    const instanceEvents = this.listeners.get(targetId)

    if (instanceEvents) {
      const callbacks = instanceEvents.get(eventType)
      if (callbacks) {
        ;[...callbacks].forEach((fn) => {
          fn(e)
        })
      }
    }
  }

  /**
   * 销毁管理器
   * 必须在地图销毁前调用，防止内存泄漏
   */
  public destroy(): void {
    // 解绑所有底层 Mapbox 事件
    this.activeLayerListeners.forEach((handler, key) => {
      // 用 lastIndexOf 分割，避免 layerId 本身含 ':' 时解析错误
      const sep = key.lastIndexOf(':')
      const layerId = key.substring(0, sep)
      const eventType = key.substring(sep + 1) as MapEventType
      try {
        this.map.off(eventType, layerId, handler)
      } catch (err) {
        // 忽略地图已销毁导致的错误
      }
    })

    this.activeLayerListeners.clear()
    this.listeners.clear()
    this.currentHoverIdByLayer.clear()
  }
}
