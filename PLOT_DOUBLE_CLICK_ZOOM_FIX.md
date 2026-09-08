# Plot 双击结束绘制触发地图缩放：修改方案

> 状态：待实施。本文件只记录技术方案，尚未修改运行代码。

## 1. 问题现象

Line、Fill 等标绘通过双击结束绘制时，地图可能同时执行一次 `doubleClickZoom`，造成视图意外放大。

浏览器一次双击会按顺序产生以下事件：

```text
click(detail=1)
→ click(detail=2)
→ dblclick
```

当前创建流程开始时会调用 `map.doubleClickZoom.disable()`，但第二次 `click` 有机会先结束绘制并同步恢复 `doubleClickZoom`。紧接着到来的 `dblclick` 已经没有创建事件拦截，Mapbox 因而执行地图放大。

## 2. 根因分析

### 2.1 Line

`LineCreateEvent.onClick` 每次点击都会查询当前控制点。双击的第一次 `click` 插入终点后，第二次 `click` 可能命中刚生成的控制点，从而提前调用 `stop()`。

随后执行：

```text
LineCreateEvent.stop()
→ Line.stop()
→ LineCreateEvent.disabled()
→ EventState.unlockDoubleClickZoom()
→ map.doubleClickZoom.enable()
```

这套流程发生在真正的 `dblclick` 到达之前。

### 2.2 Fill

Fill 双击首节点结束时也可能在第二次 `click` 阶段命中首节点并调用 `stop()`，产生相同问题。

如果双击位置不是首节点，两个 `click` 还可能重复插入末端顶点。

### 2.3 Circle

Circle 使用两次点击完成绘制。用户在设置半径时双击，第一次 `click` 就可能完成 Circle 并恢复双击缩放，后续 `dblclick` 会触发地图放大。

### 2.4 `preventDefault()` 为什么不够

在 `click` 事件中调用 `MapMouseEvent.preventDefault()` 只能阻止当前 Mapbox 事件的默认行为，不能取消之后独立产生的 `dblclick`。

因此需要确保绘制结束后，双击缩放锁继续保持到当前鼠标手势完全结束。

## 3. 设计目标

- 双击结束 Line、Fill 时地图不缩放。
- Circle 的第二个点使用双击时地图不缩放。
- 双击不会重复插入 Line 或 Fill 的末端顶点。
- 保留现有多绘制会话的引用计数。
- 如果地图原本关闭了双击缩放，结束绘制后仍保持关闭。
- 延迟恢复期间开始新的绘制时，不得错误开启双击缩放。
- `hide()`、`remove()` 等非鼠标结束操作仍可立即释放缩放锁。

## 4. 修改范围

计划修改以下文件：

```text
src/core/EventState/index.ts
src/modules/Plot/plugins/Events/LineEvents.ts
src/modules/Plot/plugins/Events/FillEvents.ts
src/modules/Plot/plugins/Events/CircleEvents.ts
tests/plot/plot.test.mjs
```

## 5. EventState：支持手势结束后延迟恢复

修改 `src/core/EventState/index.ts`。

缩放锁增加待恢复定时器，并为正常绘制完成提供延迟恢复标记。建议延迟 `100ms`，只覆盖第二次 `click` 之后紧接着产生的 `dblclick`。

```ts
import type { Map, MapMouseEvent } from 'mapbox-gl'

import { Module } from '@/core/Module'
import type { EventMessage } from '@/types/EventState'
import { EventStatus } from '@/types/EventState'

interface DoubleClickZoomLock {
  count: number
  enabled: boolean
  restoreTimer: ReturnType<typeof setTimeout> | null
}

const DOUBLE_CLICK_ZOOM_RESTORE_DELAY = 100

export abstract class EventState extends Module {
  private static zoomLocks = new WeakMap<Map, DoubleClickZoomLock>()

  private ownsZoomLock = false
  private deferZoomRestore = false

  protected lockDoubleClickZoom(): void {
    if (this.ownsZoomLock) return

    const map = this.context.map
    const lock = EventState.zoomLocks.get(map) ?? {
      count: 0,
      enabled: map.doubleClickZoom.isEnabled(),
      restoreTimer: null,
    }

    if (lock.restoreTimer !== null) {
      clearTimeout(lock.restoreTimer)
      lock.restoreTimer = null
    }

    lock.count++
    EventState.zoomLocks.set(map, lock)

    this.ownsZoomLock = true
    map.doubleClickZoom.disable()
  }

  /** 标记本次解锁来自一次正常的鼠标绘制完成操作。 */
  protected deferDoubleClickZoomRestore(): void {
    this.deferZoomRestore = true
  }

  protected unlockDoubleClickZoom(): void {
    if (!this.ownsZoomLock) {
      this.deferZoomRestore = false
      return
    }

    this.ownsZoomLock = false

    const map = this.context.map
    const lock = EventState.zoomLocks.get(map)
    const shouldDefer = this.deferZoomRestore

    this.deferZoomRestore = false

    if (!lock) return

    lock.count = Math.max(0, lock.count - 1)

    if (lock.count > 0) return

    const restore = (): void => {
      const current = EventState.zoomLocks.get(map)

      // 延迟阶段可能已经开始了另一场绘制。
      if (current !== lock || lock.count !== 0) return

      lock.restoreTimer = null

      if (lock.enabled) {
        map.doubleClickZoom.enable()
      }

      EventState.zoomLocks.delete(map)
    }

    if (shouldDefer) {
      lock.restoreTimer = setTimeout(restore, DOUBLE_CLICK_ZOOM_RESTORE_DELAY)
    } else {
      restore()
    }
  }

  // 其余代码保持不变。
}
```

### 5.1 并发行为

如果延迟恢复期间又开始绘制，`lockDoubleClickZoom()` 会取消待执行的恢复定时器，并继续使用原锁记录的 `enabled` 状态。

如果仍有其他创建事件持有缩放锁，当前会话结束时只减少 `count`，不会开启地图双击缩放。

### 5.2 取消和销毁

只有正常鼠标绘制完成前才调用 `deferDoubleClickZoomRestore()`。

以下情况仍走立即恢复：

- 主动调用 `stop()` 取消绘制。
- `hide()` 终止绘制。
- `remove()` 或地图销毁。

## 6. LineCreateEvent

修改 `src/modules/Plot/plugins/Events/LineEvents.ts`。

### 6.1 忽略双击产生的第二次 click

```ts
private onClick = (e: MapMouseEvent): void => {
  // 第一次 click 已经添加了终点；第二次 click 交给 dblclick 完成绘制。
  if (e.originalEvent.detail > 1) return

  if (this.count >= 1) {
    const layers = new Set(
      [...this.line.points, ...this.line.midPoints].map((item) => item.LAYER),
    )

    const features = this.context.map.queryRenderedFeatures(e.point, {
      layers: [...layers],
    })

    if (
      features.some((feature) =>
        [...this.line.points, ...this.line.midPoints].some(
          (point) => String(feature.properties?.id ?? feature.id) === point.id,
        ),
      )
    ) {
      this.stop(e)
      return
    }
  }

  this.line.insertPoint(this.count, e.lngLat)
  this.count++
}
```

### 6.2 绘制成功后延迟恢复缩放

```ts
private stop = (e: MapMouseEvent): void => {
  e.preventDefault()

  if ((this.line.options.position?.length ?? 0) < 2) return

  // 必须放在 line.stop() 之前，因为 line.stop() 会触发 disabled()。
  this.deferDoubleClickZoomRestore()

  this.line.stop()

  this.context.map.getCanvasContainer().style.cursor = ''
  this.setDrawLngLat(null)
  this.count = 0

  this.disabled()
  this.line.edit()
  this.line.render()
  this.line.emit(Event.CREATE, this.message<Line>(e, this.line))
}
```

## 7. FillCreateEvent

修改 `src/modules/Plot/plugins/Events/FillEvents.ts`。

### 7.1 忽略双击产生的第二次 click

```ts
private onClick = (e: MapMouseEvent): void => {
  // 防止双击时重复插入最后一个顶点。
  if (e.originalEvent.detail > 1) return

  // 其余逻辑保持不变。
}
```

### 7.2 绘制成功后延迟恢复缩放

```ts
private stop = (e: MapMouseEvent): void => {
  e.preventDefault()

  if (!this.fill.line || this.count < 3) return

  const distinct = new Set(
    this.fill.line.options.position?.map((position) => position.toArray().join(',')),
  )

  if (distinct.size < 3) return

  const firstPoint = this.fill.line.points.at(0)

  if (firstPoint?.center) {
    const point = this.fill.line.insertPoint(this.count, firstPoint.center)
    point.hide()
  }

  this.context.map.getCanvasContainer().style.cursor = CURSOR.EMPTY
  this.setDrawLngLat(null)
  this.count = 0
  this.fill.setState({ create: false })

  this.deferDoubleClickZoomRestore()
  this.disabled()

  this.fill.edit()
  this.fill.emit(Event.CREATE, this.message<Fill>(e, this.fill))
}
```

## 8. CircleCreateEvent

修改 `src/modules/Plot/plugins/Events/CircleEvents.ts`。

Circle 是两点式绘制，不忽略第二次 `click`，只需要在完成前标记延迟恢复：

```ts
private finish(e: MapMouseEvent): void {
  if ((this.circle.radius ?? 0) <= 0) return

  e.preventDefault()

  this.deferDoubleClickZoomRestore()

  this.circle.stop()
  this.circle.edit()
  this.circle.emit(Event.CREATE, this.message<Circle>(e, this.circle))
}
```

## 9. 测试方案

修改 `tests/plot/plot.test.mjs`。

### 9.1 模拟 Mapbox 默认双击缩放

```js
const map = {
  zoomEnabled: true,
  zoomCount: 0,

  fire(type, e, layer = '') {
    for (const fn of [...(events.get(`${type}:${layer}`) ?? [])]) {
      fn(e)
    }

    if (type === 'dblclick' && this.zoomEnabled && !e.defaultPrevented) {
      this.zoomCount++
    }
  },
}
```

### 9.2 鼠标事件增加 detail 和 preventDefault 状态

```js
const mouse = (position, id, detail = 1) => ({
  lngLat: position,
  point: { x: 0, y: 0 },
  originalEvent: { detail },
  defaultPrevented: false,

  preventDefault() {
    this.defaultPrevented = true
  },

  features: id
    ? [{ id, properties: { id }, source: PLOT_SOURCE_NAME }]
    : [],
})
```

### 9.3 模拟完整双击序列

```js
map.fire('click', mouse(position, undefined, 1))
map.fire('click', mouse(position, undefined, 2))
map.fire('dblclick', mouse(position, undefined, 2))

assert.equal(map.zoomCount, 0)

await new Promise((resolve) => setTimeout(resolve, 120))

assert.equal(map.zoomEnabled, true)
```

### 9.4 必测场景

- Line 双击结束后地图不缩放。
- Line 双击只添加一个末端顶点。
- Fill 双击结束后地图不缩放。
- Fill 双击只添加一个末端顶点并正确闭合。
- Fill 双击首节点结束时地图不缩放。
- Circle 第二个位置使用双击时地图不缩放。
- 100ms 后恢复地图原来的双击缩放状态。
- 地图原本关闭双击缩放时，结束后仍保持关闭。
- 多个绘制会话并存时，最后一个会话结束前不恢复缩放。
- 延迟恢复期间重新开始绘制时，待恢复任务被取消。
- `hide()`、`remove()` 期间不存在残留定时器或事件监听。

## 10. 验证命令

完成修改后执行：

```bash
pnpm run type-check
pnpm run test:plot
pnpm run lint
pnpm run check
```

## 11. 不采用的方案

不直接使用以下写法：

```ts
setTimeout(() => {
  map.doubleClickZoom.enable()
}, 100)
```

原因：

- 会绕过现有缩放锁引用计数。
- 多个标绘同时创建时可能提前开启缩放。
- 会把用户原本关闭的 `doubleClickZoom` 意外打开。
- 新一轮绘制已经开始时，旧定时器仍可能开启缩放。

延迟恢复必须由 `EventState` 统一管理，并在恢复前重新检查当前锁对象和引用计数。
