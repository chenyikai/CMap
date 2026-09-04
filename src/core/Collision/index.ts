import type { Map } from 'mapbox-gl'
import RBush from 'rbush'

import type { CollisionOptions } from '@/types/Collision'
import type { CollisionItemOptions, Id } from '@/types/Collision/item.ts'

import CollisionItem from './CollisionItem.ts'

/**
 * 基于 RBush 空间索引的 BBox 碰撞检测系统
 *
 * 通用设计，不依赖任何业务类型。使用方传入带有多个候选方向 BBox 的列表，
 * 系统按优先级逐一尝试，为每个 item 找到第一个不与已放置项冲突的方向。
 *
 * **典型用法（配合 Tooltip 标注防重叠）**：
 * ```typescript
 * const collision = new Collision<Anchor>(map)
 * collision.load(tooltips.map(t => ({
 *   id: t.id,
 *   positions: t.getAllBbox(),
 *   priority: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
 * }))).forEach(item => {
 *   if (item.visible) tooltip.setAnchor(item.dir)
 * })
 * ```
 *
 * **增量用法**：
 * ```typescript
 * collision.add({ id: 'new-item', positions: { left: bbox } })
 * collision.remove('old-item')
 * collision.collides()  // 重新计算
 * ```
 *
 * @template T 方向标识类型，默认 string
 */
class Collision<T extends string = string> {
  /** RBush 空间索引树，每次 collides() 前会自动清空重建 */
  private _tree = new RBush<CollisionItem<T>>()

  /** 当前管理的所有碰撞项 */
  private _items: CollisionItem<T>[] = []

  constructor(_map?: Map, config?: CollisionOptions<T>) {
    if (config?.collisions?.length) {
      this.load(config.collisions)
    }
  }

  /**
   * 批量加载碰撞项并立即执行碰撞检测
   *
   * 会替换当前所有 items，适合整体刷新场景（如地图 zoom 后重算）。
   * @returns 所有碰撞项，可通过 item.visible / item.dir 读取结果
   */
  load(options: CollisionItemOptions<T>[]): CollisionItem<T>[] {
    this._items = options.map((opt) => new CollisionItem<T>(opt))
    return this.collides()
  }

  /**
   * 增量添加单个碰撞项
   *
   * 添加后需调用 collides() 重新计算结果。
   */
  add(option: CollisionItemOptions<T>): CollisionItem<T> {
    const item = new CollisionItem<T>(option)
    this._items.push(item)
    return item
  }

  /**
   * 按 id 移除碰撞项
   *
   * 移除后需调用 collides() 重新计算结果。
   */
  remove(id: Id): void {
    const idx = this._items.findIndex((item) => item.id === id)
    if (idx !== -1) this._items.splice(idx, 1)
  }

  /** 获取指定 id 的碰撞项 */
  getItem(id: Id): CollisionItem<T> | undefined {
    return this._items.find((item) => item.id === id)
  }

  /** 获取所有碰撞项 */
  getAll(): CollisionItem<T>[] {
    return this._items
  }

  /** 清空所有碰撞项和空间索引 */
  clear(): void {
    this._tree.clear()
    this._items = []
  }

  /**
   * 执行碰撞检测，为每个 item 确定最终放置方向
   *
   * 每次调用都会重建空间索引树，按 items 顺序逐一处理：
   * - 按 priority 顺序尝试每个候选方向
   * - 找到第一个与树中已有项不相交的方向，标记为 visible = true 并插入树
   * - 所有方向均冲突时，标记为 visible = false
   *
   * @returns 所有碰撞项（含 visible 和 dir 结果）
   */
  collides(): CollisionItem<T>[] {
    this._tree.clear()

    for (const item of this._items) {
      const placed = item.priority.some((dir) => {
        item.setDir(dir)

        if (this._tree.collides(item)) return false

        item.setVisible(true)
        this._tree.insert(item)
        return true
      })

      if (!placed) {
        item.setVisible(false)
      }
    }

    return this._items
  }
}

export default Collision
