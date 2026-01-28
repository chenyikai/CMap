import { trackData } from './mock'
import { set } from "lodash-es";
import { Track } from "../../src/modules/Track";
import { LngLat, Map } from "mapbox-gl";

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

export function registerTack(map: Map) {
  const { k, v } = trackData.result
  const data = kvToJson(k, v)
  console.log(data, 'data');
  const id = '490126512-312312-3131312'

  const track = new Track(map, { startLabel: '起点', endLabel: '终点' })

  track.load(data.map((item, index) => {
    return {
      id: id,
      pId: `${id}-point-${String(index)}`,
      position: new LngLat(item.lon, item.lat),
      time: new Date(Number(item.time)),
      cog: item.cog,
      sog: item.sog,
      props: item
    }
  }))

  track.render()
}
