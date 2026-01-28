import { CMap } from "../src/modules/CMap";
import '../src/styles/index.scss'
import { initShip } from "./ship";
import { registerTack } from "./track";
// import { Tooltip } from '@/core/Tooltip'

const cMap = new CMap({
  container: 'map',
  type: CMap.LAND,
  center: [122.09160659512042, 30.004767949301183],
  zoom: 14,
});

cMap.on('loaded', (map) => {

  window.map = map

  // console.log(map.showCollisionBoxes = true);
  // initShip(cMap)

  registerTack(map)

  // const tooltip = new Tooltip(map)

  // tooltip.add([
  //   {
  //     id: 'ship-1',
  //     position: [122.1, 30.0],
  //     anchor: 'top-right',
  //     priority: 10,
  //     content: `重要船舶`
  //   },
  //   {
  //     id: 'ship-2',
  //     position: [122.102, 30.0], // 位置很近
  //     priority: 1, // 优先级低，会被自动隐藏
  //     content: '小船'
  //   }
  // ])
})
