import axios from 'axios'
import { LngLat, Map } from "mapbox-gl";
import { set } from "lodash-es";
import { IAisShipOptions } from "../../src/types/Ship/AisShip";
import Ship from "../../src/modules/Ship";
import { CMap } from "../../src/modules/CMap"
import { staticShipData } from "./mock";
import { AisShip } from "../../src";

let ship: Ship | null = null

export function initShip(cMap: CMap) {
  cMap.mapLoaded().then(map => {
    window.ship = ship = new Ship(map, {
      plugins: [AisShip]
    });

    setTimeout(() => {
      // ship!.select('413363020')
    }, 2000)

    getShipData(map, false)

    map.on('moveend', () => {
      getShipData(map, false);
    });
  })
}


function getBounds(map: Map) {
  const { _ne: maxData, _sw: minData } = map.getBounds()!;
  const level = map.getZoom();
  return {
    maxLon: maxData.lng,
    minLon: minData.lng,
    maxLat: maxData.lat,
    minLat: minData.lat,
    level,
  };
}

function kvToJson(k: any, v: any) {
  const list: any = [];
  v.forEach((valueItem: any) => {
    let data = {};
    valueItem.forEach((item: any, index: any) => {
      if (Array.isArray(item)) {
        set(data, 'list', {
          k: k[index],
          v: item,
        });
      } else {
        set(data, k[index], item);
      }
    });
    list.push(data);
  });
  return list;
}

function getShipData(map: Map, isStatic: boolean = false) {
  if (isStatic) {
    renderShip(map, staticShipData)
    return
  }

  axios
    .post('/ship/rest/ehhship/getShipDataList', getBounds(map), {
      headers: {
        Authorization: 'bearer d018ebb6-09cc-4f56-832d-8a521abd54d2',
      },
    })
    .then(({ data }) => {
      if (Object.values(data.data).length === 0 && ship) {
        ship.removeAll()
        return
      }
      renderShip(map, data.data)
    });
}

function renderShip(_map: Map, data: any) {
  if (_map.getZoom() < 12 && ship) {
    ship.removeAll()
    return
  }

  const { k, v } = data;
  let shipData = []
  if (k && v) {
     shipData  = kvToJson(k, v);
  } else {
     shipData  = data
  }

  const list: Array<IAisShipOptions> = shipData.map((item: any) => {
    const [lat, lon] = item.location.split(',');

    const option: IAisShipOptions = {
      type: "Ais",
      direction: item.hdg || 0,
      height: item.length,
      id: item.mmsi,
      name: item.cnname || item.enname || item.mmsi,
      position: new LngLat(Number(lon), Number(lat)),
      speed: item.sog,
      hdg: item.hdg || 0,
      cog: item.cog,
      rot: item.rot,
      statusId: item.statusId,
      status: item.status,
      time: item.updateTime,
      width: item.width,
      top: item.toBow,
      bottom: item.toStern,
      right: item.toStarboard,
      left: item.toPort,
      tooltip: true,
      immediate: true
    };

    return option
  });

  if (ship) {
    ship.load(list)
  }
}
