import { LngLat, type Map as MapboxMap } from 'mapbox-gl'
import type { TabPageApi, FolderApi } from '@tweakpane/core'
import { Pane } from 'tweakpane'
import { IconManager, Fill, Line, ArrowLine, Circle, IconPoint, IndexLine, IndexPoint, Point } from '@/index'
import { logEvent } from '../utils/logger'
import { IconAnchor } from "../../src/types/Plot/IconPoint";
import { fillData, lineData } from "./mock";


// 集中管理当前画布上所有的标绘实例
const activePlots = new Map<string, any>()

// 🌟 1. 定义全局标绘状态与动态参数 (用于创建)
const state = {
  plotType: 'Point',
  name: '未命名标绘',
  isName: true,
  radius: 1000,
  strokeWidth: 2,
  strokeColor: '#f00',
  circleColor: '#fff',
  circleRadius: 10,
  textColor: '#333',
  index: 1,
  icon: 'wx',
  iconSize: 1,
  iconRotate: 0,
  iconAnchor: 'center',
  lineColor: '#f00',
  lineWidth: 3,
  fillColor: '#00BFFF',
  fillOpacity: 0.4,
  selectedPlotId: '',
}

// 🌟 2. 选中实例的编辑状态 (用于编辑选中的标绘)
const editState = {
  name: '',
  isName: true,
  circleRadius: 10,
  circleColor: '#fff',
  strokeWidth: 2,
  strokeColor: '#f00',
  textColor: '#333',
  index: 1,
  icon: 'wx',
  iconSize: 1,
  iconRotate: 0,
  iconAnchor: 'center',
  lineColor: '#f00',
  lineWidth: 3,
  fillColor: '#00BFFF',
  fillOpacity: 0.4,
  radius: 1000,
  // 🌟 核心：用于动态绑定坐标列表的数组
  positions:[] as { x: number, y: number }[]
}

// 模拟数据坐标字典
const mockPositions = {
  point: new LngLat(122.0844, 30.0012),
  line: [
    [122.0671, 29.9906],[122.0754, 29.9871],[122.0870, 29.9867],[122.0920, 29.9890]
  ].map(p => new LngLat(p[0], p[1])),
  fill: [
    [122.0668, 30.0093],[122.0676, 30.0034],[122.0896, 30.0055],[122.0985, 30.0092],[122.0947, 30.0157]
  ].map(p => new LngLat(p[0], p[1])),
  circle: new LngLat(122.0844, 30.0012),
}

function addMockLine(map: MapboxMap) {
  const position = lineData.map((item) => {
    return new LngLat(item[0], item[1])
  })

  const line = new Line(map, {
    id: 'mockLine',
    name: '模拟线-1',
    visibility: 'visible',
    isName: true,
    position,
    vertexStyle: {
      "circle-radius": 0,
      "circle-stroke-width": 0,
    },
  })

  line.render()

  activePlots.set(line.id, line)
}

function addMockFill(map: MapboxMap) {
  fillData.forEach((item, index) => {
    const fill = new Fill(map, {
      id: `mockFill-${index}`,
      name: '模拟面' + index,
      visibility: 'visible',
      isName: true,
      position: item.map(ele => new LngLat(ele[0], ele[1])),
      vertexStyle: {
        "circle-radius": 0,
        "circle-stroke-width": 0,
      },
    })

    fill.render()

    activePlots.set(fill.id, fill)
  })
}

// ==========================================
// 主入口：创建标绘面板
// ==========================================
export async function initPlotDebug(map: MapboxMap, tab: TabPageApi) {
  const manage = new IconManager(map)
  await manage.addSvg({
    name: 'wx',
    svg: '<svg t="1773040987808" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11741" width="32" height="32"><path d="M512 512m-512 0a512 512 0 1 0 1024 0a512 512 0 1 0-1024 0Z" fill="#FFFFFF" p-id="11742"></path><path d="M512 512m-469.333333 0a469.333333 469.333333 0 1 0 938.666666 0a469.333333 469.333333 0 1 0-938.666666 0Z" fill="#00A5FE" p-id="11743"></path><path d="M799.061333 554.922667l-54.101333 63.488 21.333333 1.877333a295.125333 295.125333 0 0 1-131.456 57.856c-61.866667 3.754667-90.837333-76.544-90.837333-76.544v-132.522667h83.2v-39.210666h-79.445333v-52.266667a83.285333 83.285333 0 0 0 58.112-80.256 85.333333 85.333333 0 0 0-87.082667-84.010667h-1.92a85.333333 85.333333 0 0 0-86.997333 84.010667 85.802667 85.802667 0 0 0 57.984 80.256v52.266667h-79.274667v39.210666h83.114667v132.522667s-30.933333 78.378667-92.8 76.544a295.125333 295.125333 0 0 1-131.456-57.856l21.333333-1.877333-56.106667-63.488-19.328 78.421333 23.210667-5.589333a291.157333 291.157333 0 0 0 117.930667 110.122666c71.509333 31.744 143.061333 70.912 158.506666 72.789334 15.445333-1.877333 86.997333-41.088 156.586667-72.789334a322.133333 322.133333 0 0 0 117.930667-110.122666l23.210666 5.589333z m-280.32-210.944a46.933333 46.933333 0 0 1-48.341333-46.677334 46.250667 46.250667 0 0 1 46.421333-44.757333h1.92a46.250667 46.250667 0 0 1 46.378667 44.8 45.44 45.44 0 0 1-46.336 46.677333z" fill="#FFFFFF" p-id="11744"></path></svg>'
  })

  // addMockFill(map)
  // addMockLine(map)

  // ==========================================
  // 🎛️ 创建与参数配置
  // ==========================================
  const createFolder = tab.addFolder({ title: '🎛️ 标绘创建与参数', expanded: true })

  createFolder.addBinding(state, 'plotType', {
    label: '标绘类型',
    options: {
      '基础点 (Point)': 'Point', '序号点 (IndexPoint)': 'IndexPoint', '图标点 (IconPoint)': 'IconPoint',
      '基础折线 (Line)': 'Line', '箭头线 (ArrowLine)': 'ArrowLine', '序号线 (IndexLine)': 'IndexLine',
      '多边形 (Fill)': 'Fill', '圆形 (Circle)': 'Circle'
    }
  }).on('change', updateDynamicParams)

  createFolder.addBinding(state, 'name', { label: '标绘名称' })
  createFolder.addBinding(state, 'isName', { label: '开启文本' })

  // 属性绑定
  const bFillColor = createFolder.addBinding(state, 'fillColor', { label: '面填充色' })
  const bFillOpacity = createFolder.addBinding(state, 'fillOpacity', { label: '面透明度', min: 0.1, max: 1, step: 0.1 })
  const bRadius = createFolder.addBinding(state, 'radius', { label: '圆半径(米)', min: 1, max: 10000, step: 10 })
  const bLineWidth = createFolder.addBinding(state, 'lineWidth', { label: '线宽', min: 1, max: 15, step: 1 })
  const bLineColor = createFolder.addBinding(state, 'lineColor', { label: '线颜色' })
  const bIndex = createFolder.addBinding(state, 'index', { label: '序号', min: 1, max: 999, step: 1 })
  const bCircleRadius = createFolder.addBinding(state, 'circleRadius', { label: '点半径', min: 2, max: 30, step: 1 })
  const bCircleColor = createFolder.addBinding(state, 'circleColor', { label: '点颜色' })
  const bStrokeWidth = createFolder.addBinding(state, 'strokeWidth', { label: '外廓宽', min: 0, max: 30, step: 1 })
  const bStrokeColor = createFolder.addBinding(state, 'strokeColor', { label: '外廓色' })
  const bTextColor = createFolder.addBinding(state, 'textColor', { label: '文本颜色' })
  const bIcon = createFolder.addBinding(state, 'icon', { label: '图标', options: { wx: 'wx' } })
  const bIconSize = createFolder.addBinding(state, 'iconSize', { label: '图标大小', min: 0.01, max: 10, step: 0.1 })
  const bIconRotate = createFolder.addBinding(state, 'iconRotate', { label: '图标旋转', min: 0, max: 360, step: 1 })
  const bIconAnchor = createFolder.addBinding(state, 'iconAnchor', {
    label: '图标锚点',
    options: { '中心': 'center', '左': 'left', '右': 'right', '上': 'top', '下': 'bottom', '左下': 'bottom-left', '右下': 'bottom-right' }
  })

  createFolder.addBlade({ view: 'separator' })

  createFolder.addButton({ title: '👆 手工在地图上绘制 (start)' }).on('click', () => {
    const plot = buildPlotInstance(map)
    plot.start()
    activePlots.set(plot.id, plot)
    refreshManagePane(map)
    logEvent('开启手工绘制', { type: state.plotType, id: plot.id })
  })

  createFolder.addButton({ title: '🪄 载入预设坐标 (Mock)' }).on('click', () => {
    const plot = buildPlotInstance(map, true)
    plot.render()
    activePlots.set(plot.id, plot)
    refreshManagePane(map)
    logEvent('载入预设标绘', { type: state.plotType, id: plot.id })
  })

  function updateDynamicParams() {
    const t = state.plotType
    const hideAll = () =>[bFillColor, bFillOpacity, bRadius, bLineWidth, bLineColor, bIndex, bCircleRadius, bCircleColor, bStrokeWidth, bStrokeColor, bTextColor, bIcon, bIconSize, bIconRotate, bIconAnchor].forEach(b => b.hidden = true)
    hideAll()
    if (['Point', 'IndexPoint'].includes(t)) {
      bCircleRadius.hidden = bStrokeWidth.hidden = bStrokeColor.hidden = bCircleColor.hidden = bTextColor.hidden = false;
      if (t === 'IndexPoint') bIndex.hidden = false;
    }
    if (t === 'IconPoint') {
      bIcon.hidden = bIconSize.hidden = bIconRotate.hidden = bIconAnchor.hidden = bTextColor.hidden = false;
    }
    if (['Line', 'IndexLine'].includes(t)) {
      bLineWidth.hidden = bLineColor.hidden = bCircleRadius.hidden = bStrokeWidth.hidden = bStrokeColor.hidden = bCircleColor.hidden = bTextColor.hidden = false;
    }
    if (t === 'ArrowLine') {
      bLineWidth.hidden = bLineColor.hidden = bIconSize.hidden = false;
    }
    if (t === 'Fill') {
      bFillColor.hidden = bFillOpacity.hidden = bLineColor.hidden = bLineWidth.hidden = false;
    }
    if (t === 'Circle') {
      bRadius.hidden = bFillColor.hidden = bFillOpacity.hidden = bLineColor.hidden = bLineWidth.hidden = false;
    }
  }
  updateDynamicParams()
}

// ==========================================
// 📋 独立面板：已绘标绘管理
// ==========================================
let managePaneInstance: Pane | null = null
let listFolder: FolderApi | null = null
let coordFolder: FolderApi | null = null

export function initPlotManagePane(map: MapboxMap, pane: Pane) {
  managePaneInstance = pane
  refreshManagePane(map)
}

function refreshManagePane(map: MapboxMap) {
  if (!managePaneInstance) return

  // 清空旧内容
  managePaneInstance.children.forEach(child => child.dispose())

  if (activePlots.size === 0) {
    // @ts-ignore
    managePaneInstance.addBinding({ msg: '暂无标绘实例' }, 'msg', { readonly: true, label: '状态' })
    return
  }

  const plotIds = Array.from(activePlots.keys())
  if (!activePlots.has(state.selectedPlotId)) state.selectedPlotId = plotIds[0]

  const options = Array.from(activePlots.values()).map(p => ({
    text: p.options.name ? `${p.options.name} [${p.id.split('-')[0]}]` : p.id,
    value: p.id
  }))

  // 1. 实例选择
  managePaneInstance.addBinding(state, 'selectedPlotId', { label: '当前选中', options }).on('change', () => {
    syncEditState(map)
  })

  managePaneInstance.addBlade({ view: 'separator' })

  // 2. 快捷操作
  const actionFolder = managePaneInstance.addFolder({ title: '快捷操作' })
  actionFolder.addButton({ title: '👁️ 显示 (show)' }).on('click', () => activePlots.get(state.selectedPlotId)?.show())
  actionFolder.addButton({ title: '🚫 隐藏 (hide)' }).on('click', () => activePlots.get(state.selectedPlotId)?.hide())
  actionFolder.addButton({ title: '✏️ 开启编辑 (edit)' }).on('click', () => activePlots.get(state.selectedPlotId)?.edit())
  actionFolder.addButton({ title: '🔒 结束编辑 (unedit)' }).on('click', () => activePlots.get(state.selectedPlotId)?.unedit())
  actionFolder.addButton({ title: '🔍 镜头聚焦 (focus)' }).on('click', () => activePlots.get(state.selectedPlotId)?.focus())

  // 3. 参数动态修改面板
  const editPropsFolder = managePaneInstance.addFolder({ title: '⚙️ 属性修改' })
  editPropsFolder.addBinding(editState, 'name', { label: '标绘名称' })
  editPropsFolder.addBinding(editState, 'isName', { label: '开启文本' })

  const eFillColor = editPropsFolder.addBinding(editState, 'fillColor', { label: '面填充色' })
  const eFillOpacity = editPropsFolder.addBinding(editState, 'fillOpacity', { label: '面透明度', min: 0.1, max: 1, step: 0.1 })
  const eRadius = editPropsFolder.addBinding(editState, 'radius', { label: '圆半径(米)', min: 1, max: 10000, step: 10 })
  const eLineWidth = editPropsFolder.addBinding(editState, 'lineWidth', { label: '线宽', min: 1, max: 15, step: 1 })
  const eLineColor = editPropsFolder.addBinding(editState, 'lineColor', { label: '线颜色' })
  const eIndex = editPropsFolder.addBinding(editState, 'index', { label: '序号', min: 1, step: 1 })
  const eCircleRadius = editPropsFolder.addBinding(editState, 'circleRadius', { label: '点半径', min: 2, max: 30, step: 1 })
  const eCircleColor = editPropsFolder.addBinding(editState, 'circleColor', { label: '点颜色' })
  const eStrokeWidth = editPropsFolder.addBinding(editState, 'strokeWidth', { label: '外廓宽', min: 0, max: 30, step: 1 })
  const eStrokeColor = editPropsFolder.addBinding(editState, 'strokeColor', { label: '外廓色' })
  const eTextColor = editPropsFolder.addBinding(editState, 'textColor', { label: '文本颜色' })
  const eIconSize = editPropsFolder.addBinding(editState, 'iconSize', { label: '图标大小', min: 0.01, max: 10, step: 0.1 })
  const eIconRotate = editPropsFolder.addBinding(editState, 'iconRotate', { label: '图标旋转', min: 0, max: 360, step: 1 })

  editPropsFolder.addButton({ title: '💾 保存属性修改' }).on('click', () => {
    const plot = activePlots.get(state.selectedPlotId)
    if (!plot) return
    const type = plot.id.split('-')[0]

    plot.options.name = editState.name
    plot.options.isName = editState.isName
    plot.options.style = plot.options.style || {}

    if (['Point', 'IndexPoint'].includes(type)) {
      plot.options.style['circle-radius'] = editState.circleRadius
      plot.options.style['circle-color'] = editState.circleColor
      plot.options.style['circle-stroke-width'] = editState.strokeWidth
      plot.options.style['circle-stroke-color'] = editState.strokeColor
      plot.options.style['text-color'] = editState.textColor
      if (type === 'IndexPoint') plot.options.index = editState.index
    }
    if (type === 'IconPoint') {
      plot.options.style['icon-size'] = editState.iconSize
      plot.options.style['icon-rotate'] = editState.iconRotate
      plot.options.style['text-color'] = editState.textColor
    }
    if (['Line', 'IndexLine', 'ArrowLine'].includes(type)) {
      plot.options.style['line-color'] = editState.lineColor
      plot.options.style['line-width'] = editState.lineWidth
    }
    if (type === 'Fill') {
      plot.options.style['fill-color'] = editState.fillColor
      plot.options.style['fill-opacity'] = editState.fillOpacity
      if (plot.options.outLineStyle) {
        plot.options.outLineStyle['line-color'] = editState.lineColor
        plot.options.outLineStyle['line-width'] = editState.lineWidth
      }
    }
    if (type === 'Circle') {
      plot.options.radius = editState.radius
      plot.options.style['fill-color'] = editState.fillColor
      plot.options.style['fill-opacity'] = editState.fillOpacity
      plot.options.style['line-color'] = editState.lineColor
      plot.options.style['line-width'] = editState.lineWidth
    }

    plot.update(plot.options)
    logEvent('属性已更新', plot.options)
  })

  // 🌟 4. 动态坐标面板 (坐标列表)
  coordFolder = managePaneInstance.addFolder({ title: '🌐 坐标信息编辑' })

  // 5. 底部清空
  managePaneInstance.addBlade({ view: 'separator' })
  managePaneInstance.addButton({ title: '🗑️ 移除当前标绘' }).on('click', () => {
    activePlots.get(state.selectedPlotId)?.remove()
    activePlots.delete(state.selectedPlotId)
    refreshManagePane(map)
  })

  // ===== 内部同步逻辑 =====
  function syncEditState() {
    const plot = activePlots.get(state.selectedPlotId)
    if (!plot) return
    const type = plot.id.split('-')[0]
    const style = plot.options.style || {}
    const outlineStyle = plot.options.outLineStyle || {}

    // 同步基础
    editState.name = plot.options.name || ''
    editState.isName = !!plot.options.isName
    editState.circleRadius = style['circle-radius'] || 10
    editState.circleColor = style['circle-color'] || '#fff'
    editState.strokeWidth = style['circle-stroke-width'] || 2
    editState.strokeColor = style['circle-stroke-color'] || '#f00'
    editState.textColor = style['text-color'] || '#333'
    editState.iconSize = style['icon-size'] || 1
    editState.iconRotate = style['icon-rotate'] || 0
    editState.lineColor = type === 'Fill' ? outlineStyle['line-color'] || '#f00' : style['line-color'] || '#f00'
    editState.lineWidth = type === 'Fill' ? outlineStyle['line-width'] || 3 : style['line-width'] || 3
    editState.fillColor = style['fill-color'] || '#00BFFF'
    editState.fillOpacity = style['fill-opacity'] || 0.4
    editState.radius = plot.options.radius || 1000
    editState.index = plot.options.index || 1

    // 刷新属性面板显隐
    const hideAll = () =>[eFillColor, eFillOpacity, eRadius, eLineWidth, eLineColor, eIndex, eCircleRadius, eCircleColor, eStrokeWidth, eStrokeColor, eTextColor, eIconSize, eIconRotate].forEach(b => b.hidden = true)
    hideAll()
    if (['Point', 'IndexPoint'].includes(type)) {
      eCircleRadius.hidden = eStrokeWidth.hidden = eStrokeColor.hidden = eCircleColor.hidden = eTextColor.hidden = false;
      if (type === 'IndexPoint') eIndex.hidden = false;
    }
    if (type === 'IconPoint') { eIconSize.hidden = eIconRotate.hidden = eTextColor.hidden = false; }
    if (['Line', 'IndexLine', 'ArrowLine'].includes(type)) { eLineWidth.hidden = eLineColor.hidden = false; }
    if (type === 'Fill') { eFillColor.hidden = eFillOpacity.hidden = eLineColor.hidden = eLineWidth.hidden = false; }
    if (type === 'Circle') { eRadius.hidden = eFillColor.hidden = eFillOpacity.hidden = eLineColor.hidden = eLineWidth.hidden = false; }

    // 渲染坐标输入列表
    renderCoordinatesList(plot)

    // 如果图形在拖拽中，自动刷新坐标 UI
    // 避免重复绑定：先卸载旧的监听
    plot.off('doneUpdate', plot._uiRefreshHandler)
    plot.off('create', plot._uiRefreshHandler)
    plot._uiRefreshHandler = () => renderCoordinatesList(plot)
    plot.on('doneUpdate', plot._uiRefreshHandler)
    plot.on('create', plot._uiRefreshHandler)

    managePaneInstance?.refresh()
  }

  // 渲染动态坐标列表
  function renderCoordinatesList(plot: any) {
    if (!coordFolder) return

    // 清空旧的坐标控件
    [...coordFolder.children].forEach(child => child.dispose())

    const pos = plot.options.center ?? plot.options.position
    if (!pos) {
      // @ts-ignore
      coordFolder.addBinding({ msg: '等待绘制坐标...' }, 'msg', { readonly: true, label: '' })
      return
    }

    // 将 LngLat 转换为 Tweakpane 可绑定的 { x, y } 对象数组
    editState.positions =[]
    if (Array.isArray(pos)) {
      pos.forEach(p => editState.positions.push({ x: p.lng, y: p.lat }))
    } else {
      editState.positions.push({ x: pos.lng, y: pos.lat })
    }

    // 为每一个点生成一个带有微调 x,y 控件的表单
    editState.positions.forEach((_, index): void => {
      const binding = coordFolder!.addBinding(editState.positions, index, {
        label: `节点[${index}]`,
        x: { step: 0.000001 },
        y: { step: 0.000001 }
      })

      const pickerBtn = binding.element.querySelector('button')
      if (pickerBtn) {
        pickerBtn.style.display = 'none'
      }
    })

    coordFolder.addButton({ title: '📌 将坐标应用至地图' }).on('click', () => {
      // 将修改后的 { x, y } 重新转换为 LngLat 塞回 plot
      if (plot.options.center) {
        plot.options.center = new LngLat(editState.positions[0].x, editState.positions[0].y)
      } else if (Array.isArray(plot.options.position)) {
        plot.options.position = editState.positions.map(p => new LngLat(p.x, p.y))
      } else {
        plot.options.position = new LngLat(editState.positions[0].x, editState.positions[0].y)
      }

      plot.update(plot.options)
      logEvent('精准坐标修改已应用', plot.options.position)
    })
  }

  syncEditState() // 初始化执行一次
}

// ==========================================
// 🛠️ 核心工厂：根据动态参数构建标绘实例
// ==========================================
function buildPlotInstance(map: MapboxMap, isMock = false): any {
  const id = `${state.plotType}-${Date.now()}`
  const baseConfig = {
    id,
    name: state.name,
    isName: state.isName,
    visibility: 'visible' as const,
  }

  switch (state.plotType) {
    case 'Point':
      return new Point(map, {
        ...baseConfig,
        position: isMock ? mockPositions.point : undefined,
        style: {
          'circle-radius': state.circleRadius,
          'circle-color': state.circleColor,
          'circle-stroke-width': state.strokeWidth,
          'circle-stroke-color': state.strokeColor,
          'text-color': state.textColor
        }
      })
    case 'IndexPoint':
      return new IndexPoint(map, {
        ...baseConfig,
        index: state.index,
        position: isMock ? mockPositions.point : undefined,
        style: {
          'circle-radius': state.circleRadius,
          'circle-color': state.circleColor,
          'circle-stroke-width': state.strokeWidth,
          'circle-stroke-color': state.strokeColor,
          'text-color': state.textColor
        }
      })
    case 'IconPoint':
      return new IconPoint(map, {
        ...baseConfig,
        icon: state.icon,
        position: isMock ? mockPositions.point : undefined,
        style: {
          'icon-size': state.iconSize,
          'icon-rotate': state.iconRotate,
          'icon-anchor': state.iconAnchor as IconAnchor,
          'text-color': state.textColor
        }
      })
    case 'Line':
      return new Line(map, {
        ...baseConfig,
        position: isMock ? mockPositions.line : undefined,
        style: { 'line-color': state.lineColor, 'line-width': state.lineWidth },
        midStyle: {}, vertexStyle: { 'circle-radius': 5 }
      })
    case 'ArrowLine':
      return new ArrowLine(map, {
        ...baseConfig,
        position: isMock ? mockPositions.line : undefined,
        style: { 'line-color': state.lineColor, 'line-width': state.lineWidth },
        vertexStyle: {}
      })
    case 'IndexLine':
      return new IndexLine(map, {
        ...baseConfig,
        position: isMock ? mockPositions.line : undefined,
        style: { 'line-color': state.lineColor, 'line-width': state.lineWidth }
      })
    case 'Fill':
      return new Fill(map, {
        ...baseConfig,
        position: isMock ? mockPositions.fill : undefined,
        style: { 'fill-color': state.fillColor, 'fill-opacity': state.fillOpacity },
      })
    case 'Circle':
      return new Circle(map, {
        ...baseConfig,
        center: isMock ? mockPositions.circle : undefined,
        radius: isMock ? state.radius : undefined,
        unit: 'meters',
        style: {
          'fill-color': state.fillColor,
          'fill-opacity': state.fillOpacity,
          'line-color': state.lineColor,
          'line-width': state.lineWidth,
        },
      })
    default:
      return null
  }
}
