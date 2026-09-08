import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import * as turf from '@turf/turf'
import * as lodash from 'lodash-es'
import EventEmitter from 'eventemitter3'
import mapbox from 'mapbox-gl'
import polylabel from 'polylabel'

// Execute the real Plot classes with a deterministic map adapter, without WebGL.
const root = fileURLToPath(new URL('../../', import.meta.url))
const cache = new Map()
const externals = {
  '@turf/turf': turf,
  'lodash-es': lodash,
  eventemitter3: { default: EventEmitter },
  'mapbox-gl': mapbox,
  polylabel: { default: polylabel },
}
function load(relative) {
  let file = path.resolve(root, relative)
  if (!path.extname(file))
    file = fs.existsSync(file + '.ts') ? file + '.ts' : path.join(file, 'index.ts')
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const require = (name) => {
    if (name === './Context.ts') return { getOrCreateContext: (map) => map.context }
    if (externals[name]) return externals[name]
    return load(
      name.startsWith('@/') ? 'src/' + name.slice(2) : path.resolve(path.dirname(file), name),
    )
  }
  vm.runInNewContext(
    code,
    { exports, require, setTimeout, clearTimeout, queueMicrotask, console },
    { filename: file },
  )
  return exports
}
const { Point } = load('src/modules/Plot/plugins/Point')
const { IndexPoint } = load('src/modules/Plot/plugins/IndexPoint')
const { IconPoint } = load('src/modules/Plot/plugins/IconPoint')
const { Line } = load('src/modules/Plot/plugins/Line')
const { ArrowLine } = load('src/modules/Plot/plugins/ArrowLine')
const { IndexLine } = load('src/modules/Plot/plugins/IndexLine')
const { Fill } = load('src/modules/Plot/plugins/Fill')
const { Circle } = load('src/modules/Plot/plugins/Circle')
const { EventManager } = load('src/core/EventManager')
const { Event, PLOT_SOURCE_NAME } = load('src/modules/Plot/vars.ts')
const { EventStatus } = load('src/types/EventState')
const lngLat = (lng, lat = 0) => new mapbox.LngLat(lng, lat)
const options = (id, position) => ({ id, position, visibility: 'visible' })
function createMap() {
  const events = new Map()
  const states = new Map()
  const features = new Map()
  const canvas = { style: { cursor: '' } }
  const map = {
    zoomEnabled: true,
    on(type, layer, fn) {
      if (typeof layer === 'function') [fn, layer] = [layer, '']
      const key = `${type}:${layer}`
      events.set(key, [...(events.get(key) ?? []), fn])
      return this
    },
    once(type, fn) {
      const wrapper = (e) => {
        this.off(type, wrapper)
        fn(e)
      }
      wrapper.original = fn
      return this.on(type, wrapper)
    },
    off(type, layer, fn) {
      if (typeof layer === 'function') [fn, layer] = [layer, '']
      const key = `${type}:${layer}`
      events.set(
        key,
        (events.get(key) ?? []).filter((item) => item !== fn && item.original !== fn),
      )
      return this
    },
    fire(type, e, layer = '') {
      for (const fn of [...(events.get(`${type}:${layer}`) ?? [])]) fn(e)
    },
    listenerCount(type) {
      return (events.get(`${type}:`) ?? []).length
    },
    getCanvasContainer: () => canvas,
    queryRenderedFeatures: () => [],
    setFeatureState({ id }, value) {
      states.set(id, { ...states.get(id), ...value })
    },
    getFeatureState: ({ id }) => states.get(id) ?? {},
    removeFeatureState({ id }) {
      states.delete(id)
    },
    easeTo() {},
    fitBounds() {},
  }
  map.doubleClickZoom = {
    isEnabled: () => map.zoomEnabled,
    enable: () => {
      map.zoomEnabled = true
    },
    disable: () => {
      map.zoomEnabled = false
    },
  }
  map.context = {
    map,
    register: {
      addSource() {},
      addLayer() {},
      setGeoJSONData(source, input) {
        for (const feature of Array.isArray(input) ? input : [input]) {
          if (feature.geometry) features.set(feature.id, feature)
          else features.delete(feature.id)
        }
      },
    },
    focus: { set() {}, remove() {} },
    iconManage: {
      addSvg() {},
      loadSvg() {},
      getImage() {
        return { height: 20 }
      },
    },
    eventManager: new EventManager(map),
  }
  return { map, features }
}
const mouse = (position, id) => ({
  lngLat: position,
  point: { x: 0, y: 0 },
  preventDefault() {},
  features: id ? [{ id, properties: { id }, source: PLOT_SOURCE_NAME }] : [],
})

test('Point subclass events use their own layer and remove releases lifecycle listeners', () => {
  for (const Type of [Point, IndexPoint, IconPoint]) {
    const { map } = createMap()
    const p = new Type(map, { ...options('p', lngLat(1)), icon: 'test', index: 1 })
    let clicks = 0
    p.on(Event.CLICK, () => clicks++)
    map.fire('click', mouse(lngLat(1), p.id), p.LAYER)
    assert.equal(clicks, 1)
    assert.equal(p.geometry.type, 'Point')
    p.focus()
    p.unfocus()
    p.select()
    p.unselect()
    p.remove()
    p.remove()
    assert.equal(map.listenerCount('beforeRemove'), 0)
  }
})

test('event switch is accurate, edit is idempotent, unedit cancels active dragging', () => {
  const { map } = createMap()
  const p = new Point(map, options('p', lngLat(1)))
  assert.equal(p.updateEvent.switch(), EventStatus.ON)
  assert.equal(p.updateEvent.switch(), EventStatus.OFF)
  p.edit()
  p.edit()
  map.fire('mousedown', mouse(lngLat(1), p.id), p.LAYER)
  assert.equal(map.listenerCount('mousemove'), 1)
  p.unedit()
  map.fire('mousemove', mouse(lngLat(9)))
  assert.equal(p.center.lng, 1)
  assert.equal(map.listenerCount('mouseup'), 0)
})

test('node insertion/deletion keeps coordinates, stable IDs and rendering synchronized', () => {
  const { map, features } = createMap()
  const line = new Line(map, options('l', [lngLat(0), lngLat(2), lngLat(4)]))
  line.edit()
  const lastId = line.points[2].id
  line.removePointAt(1)
  assert.equal(line.options.position.length, 2)
  assert.equal(line.points[1].id, lastId)
  assert.equal(features.get(line.id).geometry.coordinates.length, 2)
  line.insertPoint(1, lngLat(3))
  assert.equal(new Set(line.points.map((p) => p.id)).size, 3)
  assert.equal(line.points[2].id, lastId)
  const vertex = line.points[1]
  map.fire('mousedown', mouse(vertex.center, vertex.id), vertex.LAYER)
  map.fire('mousemove', mouse(lngLat(5)))
  map.fire('mouseup', mouse(lngLat(5)))
  assert.equal(line.options.position[1].lng, 5)
  line.remove()
  assert.equal(features.size, 0)
  assert.equal(map.listenerCount('beforeRemove'), 0)
})

test('line drag uses mouse delta instead of snapping its center', () => {
  const { map } = createMap()
  const line = new Line(map, options('l', [lngLat(0), lngLat(10)]))
  line.edit()
  map.fire('mousedown', mouse(lngLat(1), line.id), line.LAYER)
  map.fire('mousemove', mouse(lngLat(2)))
  assert.equal(line.options.position[0].lng, 1)
  assert.equal(line.options.position[1].lng, 11)
})

test('midpoint completion preserves the original mouse event and inserts one node', () => {
  const { map } = createMap()
  const line = new Line(map, options('l', [lngLat(0), lngLat(10)]))
  line.edit()
  const mid = line.midPoints[0]
  let done
  line.on(Event.MID_DONE_UPDATE, (e) => {
    done = e
  })
  map.fire('mousedown', mouse(mid.center, mid.id), mid.LAYER)
  map.fire('mousemove', mouse(lngLat(6, 1)))
  const up = mouse(lngLat(6, 1))
  map.fire('mouseup', up)
  assert.equal(line.options.position.length, 3)
  assert.equal(done.originEvent, up)
})

test('Fill drag is isolated by feature ID and outline dragging does not throw', () => {
  const { map } = createMap()
  const a = new Fill(map, options('a', [lngLat(0), lngLat(4), lngLat(0, 4)]))
  const b = new Fill(map, options('b', [lngLat(10), lngLat(14), lngLat(10, 4)]))
  a.edit()
  b.edit()
  const oldA = a.options.position[0].lng
  map.fire('mousedown', mouse(lngLat(11, 1), b.id), b.LAYER)
  map.fire('mousemove', mouse(lngLat(12, 1)))
  map.fire('mouseup', mouse(lngLat(12, 1)))
  assert.equal(a.options.position[0].lng, oldA)
  assert.equal(b.options.position[0].lng, 11)
  map.fire('mousedown', mouse(lngLat(1), a.line.id), a.line.LAYER)
  assert.doesNotThrow(() => map.fire('mousemove', mouse(lngLat(2))))
  a.remove()
  b.remove()
  assert.equal(map.listenerCount('mousemove'), 0)
  assert.equal(map.listenerCount('beforeRemove'), 0)
})

test('Fill normalizes closure, updates title and renders replacement geometry', () => {
  const { map, features } = createMap()
  const fill = new Fill(map, options('f', [lngLat(0), lngLat(4), lngLat(0, 4), lngLat(0)]))
  assert.equal(fill.options.position.length, 4)
  const oldCenter = fill.title.center.lng
  fill.move(lngLat(oldCenter + 2, fill.center.lat))
  assert.ok(Math.abs(fill.title.center.lng - oldCenter - 2) < 1e-6)
  fill.update({ ...fill.options, name: 'Updated' })
  assert.equal(fill.options.position.length, 4)
  assert.equal(fill.title.options.name, 'Updated')
  assert.equal(features.get('f').geometry.type, 'Polygon')
  assert.equal(features.get('f').properties.meta, 'fill-shape')
  const empty = new Fill(map, options('empty', []))
  assert.equal(empty.options.position.length, 0)
  empty.start()
  assert.doesNotThrow(() => map.fire('contextmenu', mouse(lngLat(1))))
  empty.remove()
})

test('Circle renders isolated polygon data and validates its geometry options', () => {
  const { map, features } = createMap()
  const circle = new Circle(map, {
    id: 'circle',
    center: lngLat(120, 30),
    radius: 1000,
    visibility: 'visible',
    properties: { id: 'unsafe', meta: 'unsafe', visibility: 'none' },
  })
  circle.render()
  const feature = features.get(circle.id)
  assert.equal(feature.geometry.type, 'Polygon')
  assert.equal(feature.geometry.coordinates[0].length, 65)
  assert.equal(feature.properties.id, circle.id)
  assert.equal(feature.properties.meta, 'circle-shape')
  assert.equal(feature.properties.visibility, 'visible')
  assert.equal(circle.unit, 'meters')
  assert.throws(() => circle.update({ ...circle.options, radius: -1 }), /finite non-negative/)
  const listenerCount = map.listenerCount('beforeRemove')
  assert.throws(
    () => new Circle(map, { id: 'bad', radius: 1, steps: 3, visibility: 'visible' }),
    /greater than or equal to 4/,
  )
  assert.equal(map.listenerCount('beforeRemove'), listenerCount)
  circle.remove()
  assert.equal(map.listenerCount('beforeRemove'), 0)
})

test('Circle creation, control-point editing and body dragging stay synchronized', () => {
  const { map } = createMap()
  const circle = new Circle(map, { id: 'circle', visibility: 'visible' })
  let creates = 0
  circle.on(Event.CREATE, () => creates++)
  circle.start()
  assert.equal(map.zoomEnabled, false)
  map.fire('click', mouse(lngLat(120, 30)))
  map.fire('mousemove', mouse(lngLat(120.01, 30)))
  map.fire('click', mouse(lngLat(120.01, 30)))
  assert.equal(creates, 1)
  assert.equal(circle.isCreate, false)
  assert.equal(circle.isEdit, true)
  assert.ok(circle.radius > 0)
  assert.ok(circle.centerPoint)
  assert.ok(circle.radiusPoint)
  assert.equal(map.zoomEnabled, true)

  const originalRadius = circle.radius
  const radiusPoint = circle.radiusPoint
  map.fire('mousedown', mouse(radiusPoint.center, radiusPoint.id), radiusPoint.LAYER)
  map.fire('mousemove', mouse(lngLat(120.02, 30)))
  map.fire('mouseup', mouse(lngLat(120.02, 30)))
  assert.ok(circle.radius > originalRadius)

  const radiusAfterResize = circle.radius
  const centerPoint = circle.centerPoint
  map.fire('mousedown', mouse(centerPoint.center, centerPoint.id), centerPoint.LAYER)
  map.fire('mousemove', mouse(lngLat(121, 31)))
  map.fire('mouseup', mouse(lngLat(121, 31)))
  assert.equal(circle.center.lng, 121)
  assert.equal(circle.center.lat, 31)
  assert.ok(Math.abs(circle.radius - radiusAfterResize) < 1e-9)

  map.fire('mousedown', mouse(lngLat(121, 31), circle.id), circle.LAYER)
  map.fire('mousemove', mouse(lngLat(122, 32)))
  map.fire('mouseup', mouse(lngLat(122, 32)))
  assert.equal(circle.center.lng, 122)
  assert.equal(circle.center.lat, 32)

  circle.hide()
  assert.equal(map.listenerCount('mousemove'), 0)
  circle.show()
  assert.equal(circle.centerPoint.visibility, 'visible')
  assert.equal(circle.radiusPoint.visibility, 'visible')
  circle.remove()
  assert.equal(map.listenerCount('beforeRemove'), 0)
})

test('drawing preserves double-click zoom preference and removal cancels creation', () => {
  const { map } = createMap()
  map.zoomEnabled = false
  const fill = new Fill(map, options('f'))
  fill.start()
  fill.start()
  assert.equal(map.listenerCount('click'), 1)
  fill.remove()
  assert.equal(map.zoomEnabled, false)
  assert.equal(map.listenerCount('click'), 0)
  assert.equal(map.listenerCount('beforeRemove'), 0)
})

test('untouched midpoint instances are reused after insertion', () => {
  const { map } = createMap()
  const line = new Line(map, options('l', [lngLat(0), lngLat(2), lngLat(4), lngLat(6)]))
  line.edit()
  const untouched = line.midPoints[2]
  line.insertPoint(1, lngLat(1))
  assert.equal(line.midPoints[3], untouched)
  assert.equal(untouched.options.properties.index, 3)
})

test('hiding cancels interaction and showing restores editing without exposing idle midpoints', () => {
  for (const Type of [Line, Fill]) {
    const { map } = createMap()
    const plot = new Type(map, options('p', [lngLat(0), lngLat(4), lngLat(0, 4)]))
    plot.edit()
    map.fire('mousedown', mouse(lngLat(1, 1), plot.id), plot.LAYER)
    plot.hide()
    assert.equal(map.listenerCount('mousemove'), 0)
    plot.show()
    map.fire('mousedown', mouse(lngLat(1, 1), plot.id), plot.LAYER)
    assert.equal(map.listenerCount('mousemove'), 1)
    plot.unedit()
    plot.hide()
    plot.show()
    const line = plot.line ?? plot
    assert.ok(line.midPoints.every((mid) => mid.visibility === 'none'))
    plot.remove()
  }
})

test('interactive Fill creation closes once and creates a title', () => {
  const { map } = createMap()
  const fill = new Fill(map, options('f'))
  fill.start()
  map.fire('click', mouse(lngLat(0)))
  map.fire('mousemove', mouse(lngLat(1)))
  map.fire('click', mouse(lngLat(4)))
  map.fire('contextmenu', mouse(lngLat(0, 4)))
  assert.equal(fill.isCreate, false)
  assert.equal(fill.options.position.length, 4)
  assert.equal(fill.geometry.type, 'Polygon')
  assert.ok(fill.title)
  assert.equal(map.zoomEnabled, true)
  assert.equal(map.listenerCount('click'), 0)
})

test('arrow orientation and index labels track vertex edits', () => {
  const { map } = createMap()
  const arrow = new ArrowLine(map, options('a', [lngLat(0), lngLat(2), lngLat(4)]))
  arrow.render()
  const rotation = arrow.points[1].options.style['icon-rotate']
  arrow.updatePoint(1, lngLat(2, 2))
  assert.notEqual(arrow.points[1].options.style['icon-rotate'], rotation)
  arrow.insertPoint(3, lngLat(6))
  assert.equal(arrow.points[2].options.icon, 'plot-arrow')
  assert.equal(arrow.points[3].options.icon, 'plot-arrow-end')
  const indexed = new IndexLine(map, options('i', [lngLat(0), lngLat(2), lngLat(4)]))
  indexed.removePointAt(1)
  assert.equal(indexed.points[1].options.index, 2)
})

test('custom Point subclasses activate events after their layer initializes', async () => {
  class CustomPoint extends Point {
    LAYER = 'custom-point'
  }
  const { map } = createMap()
  const point = new CustomPoint(map, options('custom', lngLat(1)))
  let clicks = 0
  point.on(Event.CLICK, () => clicks++)
  await Promise.resolve()
  map.fire('click', mouse(lngLat(1), point.id), point.LAYER)
  assert.equal(clicks, 1)
  point.remove()
})

test('overlapping drawing sessions restore zoom only after the last session stops', () => {
  const { map } = createMap()
  const line = new Line(map, options('l'))
  const fill = new Fill(map, options('f'))
  line.start()
  fill.start()
  line.stop()
  assert.equal(map.zoomEnabled, false)
  fill.stop()
  assert.equal(map.zoomEnabled, true)
  line.remove()
  fill.remove()
})

test('stopping drawing removes preview coordinates from the rendered feature', () => {
  const { map, features } = createMap()
  const line = new Line(map, options('l'))
  line.start()
  map.fire('click', mouse(lngLat(0)))
  map.fire('mousemove', mouse(lngLat(1)))
  assert.equal(features.get('l').geometry.coordinates.length, 2)
  line.stop()
  assert.equal(features.has('l'), false)
  assert.equal(line.options.position.length, 1)
  line.remove()
})
