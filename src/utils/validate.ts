/**
 * 判断是否为空
 */
export function isNull(val: unknown): boolean {
  if (['boolean', 'number'].includes(typeof val)) {
    return false
  } else if (Array.isArray(val)) {
    return val.length === 0
  } else if (val instanceof Object) {
    return JSON.stringify(val) === '{}'
  } else {
    return val === 'null' || val === null || val === undefined || val === 'undefined' || val === ''
  }
}
