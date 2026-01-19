import { CMap } from "../src/modules/CMap";
import '../src/styles/index.scss'
import { initShip } from "./ship";

const cMap = new CMap({
  container: 'map',
  type: CMap.LAND,
  center: [122.09160659512042, 30.004767949301183],
  zoom: 14,
});

cMap.on('loaded', (map) => {

  window.map = map
  initShip(cMap)
})
