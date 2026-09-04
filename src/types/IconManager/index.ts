export interface Icon {
  name: string
  url: string
  options?: Partial<StyleImageMetadata>
}

export interface SvgIcon {
  name: string
  svg: string
}

export interface StyleImageMetadata {
  pixelRatio: number
  sdf: boolean
  usvg: boolean
  stretchX?: [number, number][]
  stretchY?: [number, number][]
  content?: [number, number, number, number]
}

export interface Image {
  width: number
  height: number
  image: ImageBitmap | HTMLImageElement | ImageData
}

export enum RESULT_CODE {
  SUCCESS = 0,
  FAIL = -1,
}
export interface IconLoadResult {
  code: RESULT_CODE
  data: Icon | SvgIcon
  msg: string | Error
}
