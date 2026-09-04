import type { CollisionItemOptions } from './item.ts'

export type * from './item.ts'

/**
 * Collision 初始化配置
 * @template T 方向标识类型，与 CollisionItemOptions 保持一致
 */
export interface CollisionOptions<T extends string = string> {
  /** 初始化时预加载的碰撞项列表 */
  collisions?: CollisionItemOptions<T>[]
}
