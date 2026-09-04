import type { Map as MapboxMap } from 'mapbox-gl'

import { cacheKey } from '@/config'
import Cache from '@/core/Cache'
import type { Icon, IconLoadResult, Image, SvgIcon } from '@/types/IconManager'
import { RESULT_CODE } from '@/types/IconManager'
import { convertSvgToImageObjects } from '@/utils/util.ts'

class IconManager {
  static SUCCESS = RESULT_CODE.SUCCESS
  static FAIL = RESULT_CODE.FAIL

  _map: MapboxMap
  _cache: Cache = new Cache({ uniqueKey: `${cacheKey}-icon`, type: 'localstorage' })

  // 🌟 核心修复：并发加载锁。防止同一时间多次请求同一个图标
  private loadingPromises = new Map<string, Promise<IconLoadResult>>()

  constructor(map: MapboxMap) {
    this._map = map
  }

  async load(icons: Icon[]): Promise<{ success: IconLoadResult[]; error: IconLoadResult[] }> {
    const results = await Promise.allSettled(icons.map((icon) => this.add(icon)))

    const success: IconLoadResult[] = []
    const error: IconLoadResult[] = []

    results.forEach((item) => {
      if (item.status === 'fulfilled') {
        success.push(item.value)
      } else {
        error.push(item.reason as IconLoadResult)
      }
    })

    return { success, error }
  }

  async loadSvg(icons: SvgIcon[]): Promise<{ success: IconLoadResult[]; error: IconLoadResult[] }> {
    const results = await Promise.allSettled(icons.map((icon) => this.addSvg(icon)))

    const success: IconLoadResult[] = []
    const error: IconLoadResult[] = []

    results.forEach((item) => {
      if (item.status === 'fulfilled') {
        success.push(item.value)
      } else {
        error.push(item.reason as IconLoadResult)
      }
    })

    return { success, error }
  }

  async addSvg(icon: SvgIcon): Promise<IconLoadResult> {
    // 1. 如果地图已经加载过了，直接返回
    if (this.has(icon.name)) {
      return this.error(icon, 'The image has been loaded！')
    }

    // 2. 如果该图标刚好正在加载中（被其他实例触发了），直接挂载到现有的 Promise 上等待
    if (this.loadingPromises.has(icon.name)) {
      return this.loadingPromises.get(icon.name)!
    }

    // 3. 定义并触发真实的加载任务
    const loadTask = (async (): Promise<IconLoadResult> => {
      try {
        const data = await convertSvgToImageObjects(icon.svg)

        // 🌟 核心修复：异步操作回来后，再次进行双重检查 (Double-check)
        if (!this.has(icon.name)) {
          await this._cache.set({
            name: icon.name,
            content: { width: data.image.width, height: data.image.height, image: data.image },
          })
          this._map.addImage(icon.name, data.image)
        }
        return this.success(icon)
      } catch (err: any) {
        return this.error(icon, err as unknown as string)
      } finally {
        // 无论成功还是失败，执行完毕后释放并发锁
        this.loadingPromises.delete(icon.name)
      }
    })()

    // 存入锁字典
    this.loadingPromises.set(icon.name, loadTask)
    return loadTask
  }

  add(icon: Icon): Promise<IconLoadResult> {
    // 1. 同步拦截
    if (this.has(icon.name)) {
      return Promise.resolve(this.error(icon, 'The image has been loaded！'))
    }

    // 2. 并发锁拦截
    if (this.loadingPromises.has(icon.name)) {
      return this.loadingPromises.get(icon.name)!
    }

    const loadTask = new Promise<IconLoadResult>((resolve, reject) => {
      this._map.loadImage(icon.url, (err, image) => {
        // 结束时清理锁
        this.loadingPromises.delete(icon.name)

        if (err) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, err as unknown as string))
          return
        }

        if (image) {
          // 🌟 核心修复：双重检查
          if (!this.has(icon.name)) {
            this._cache.set({
              name: icon.name,
              content: { width: image.width, height: image.height, image },
            })
            this._map.addImage(icon.name, image, icon.options)
          }
          resolve(this.success(icon))
        } else {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, 'The image has not found！'))
        }
      })
    })

    this.loadingPromises.set(icon.name, loadTask)
    return loadTask
  }

  has(name: Icon['name']): boolean {
    return this._map.hasImage(name)
  }

  getImage(name: string): Image | undefined {
    return this._cache.get(name) as Image | undefined
  }

  update(icon: Icon): Promise<IconLoadResult> {
    return new Promise((resolve, reject) => {
      if (!this._map.hasImage(icon.name)) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(this.error(icon, 'The image has not been loaded！'))
        return
      }

      this._map.loadImage(icon.url, (err, image) => {
        if (err) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, err as unknown as string))
          return
        }

        if (image) {
          this._cache.set({
            name: icon.name,
            content: { width: image.width, height: image.height },
          })
          this._map.updateImage(icon.name, image)
          resolve(this.success(icon))
        } else {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, 'The image has not found！'))
        }
      })
    })
  }

  delete(name: string): void {
    if (this._map.hasImage(name)) {
      this._map.removeImage(name)
      this._cache.remove(name)
    }
  }

  success(icon: Icon | SvgIcon): IconLoadResult {
    return {
      code: IconManager.SUCCESS,
      data: icon,
      msg: `The ${icon.name} was successfully added`,
    }
  }

  error(icon: Icon | SvgIcon, err: string | Error): IconLoadResult {
    return {
      code: IconManager.FAIL,
      data: icon,
      msg: err,
    }
  }
}

export default IconManager
