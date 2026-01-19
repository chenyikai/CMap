export interface Icon {
  name: string
  url: string
  options?: Partial<StyleImageMetadata>
}

export interface SvgIcon {
  name: string
  svg: string
}

interface StyleImageMetadata {
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
export interface result {
  code: RESULT_CODE
  data: Icon
  msg: string | Error
}

export interface loadOptions {}
