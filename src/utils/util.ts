import { envelope, featureCollection, point } from '@turf/turf'
import type { BBox } from 'geojson'
import type { Map } from 'mapbox-gl'

/**
 * 将物理距离（米）转换为当前地图层级下的屏幕像素（px）
 * @param map Mapbox 地图实例
 * @param distance 距离（单位：米）
 * @param latitude 计算基准纬度（默认取当前地图中心）
 */
export function distanceToPx(map: Map, distance: number, latitude?: number): number {
  const EARTH_CIRCUMFERENCE = 40075017

  const lat = latitude ?? map.getCenter().lat

  const zoom = map.getZoom()

  const latRad = lat * (Math.PI / 180)
  const metersPerPixel = (EARTH_CIRCUMFERENCE * Math.cos(latRad)) / Math.pow(2, zoom + 9)

  return distance / metersPerPixel
}

export function getPointScope(map: Map, x: number, y: number, width: number): BBox {
  return envelope(
    featureCollection([
      point(map.unproject([x - width / 2, y - width / 2]).toArray()),
      point(map.unproject([x + width / 2, y + width / 2]).toArray()),
    ]),
  ).bbox!
}

export async function convertSvgToImageObjects(
  svgString: string,
  width?: number,
  height?: number,
): Promise<{
  image: HTMLImageElement
  bitmap: ImageBitmap
  imageData: ImageData
}> {
  // 1. 创建一个临时的Image对象并加载SVG
  const loadSvgAsImage = (svgStr: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // 将SVG字符串转换为Blob URL
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const img = new Image()
      img.crossOrigin = 'anonymous' // 重要：避免转换后canvas被"污染"

      img.onload = (): void => {
        URL.revokeObjectURL(url) // 清理URL，释放内存
        resolve(img)
      }

      img.onerror = (event): void => {
        URL.revokeObjectURL(url)
        reject(new Error(`SVG图片加载失败：${JSON.stringify(event)}`))
      }

      img.src = url
    })
  }

  const svgImage = await loadSvgAsImage(svgString)

  // 2. 确定输出尺寸
  const outputWidth = (width ?? svgImage.naturalWidth) || svgImage.width || 300
  const outputHeight = (height ?? svgImage.naturalHeight) || svgImage.height || 150

  // 3. 绘制到Canvas
  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法获取Canvas 2D上下文')
  }

  // 清空并绘制SVG
  ctx.clearRect(0, 0, outputWidth, outputHeight)
  ctx.drawImage(svgImage, 0, 0, outputWidth, outputHeight)

  // 4. 并行转换获取所有目标格式
  const [bitmap, imageData] = await Promise.all([
    // 转换为ImageBitmap
    createImageBitmap(canvas),
    // 转换为ImageData
    Promise.resolve(ctx.getImageData(0, 0, outputWidth, outputHeight)),
  ])

  return {
    image: svgImage, // HTMLImageElement
    bitmap: bitmap, // ImageBitmap
    imageData: imageData, // ImageData
  }
}

/**
 * 将屏幕像素转换为地理距离（米）
 * @param map Mapbox 地图实例
 * @param lat 当前纬度
 * @param pixels 想要显示的像素长度
 */
export function pixelsToMeters(map: Map, lat: number, pixels: number): number {
  const EARTH_CIRCUMFERENCE = 40075017 // 地球赤道周长 (米)
  const zoom = map.getZoom()
  const latRad = (lat * Math.PI) / 180

  // 计算当前纬度和缩放下的分辨率 (米/像素)
  // Mapbox 使用 512px 的瓦片大小，所以是 2^(zoom + 9)
  const metersPerPx = (EARTH_CIRCUMFERENCE * Math.cos(latRad)) / Math.pow(2, zoom + 9)

  return pixels * metersPerPx
}
