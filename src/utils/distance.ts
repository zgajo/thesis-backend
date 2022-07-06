import { KM_TO_METERS } from "./constants";

export function greatCircleVec(lat1: number, lng1: number, lat2: number, lng2: number) {
  // return distance in m
  return calcCrow(lat1, lng1, lat2, lng2) * KM_TO_METERS;
}

// Converts numeric degrees to radians
function toRad(Value: number) {
  return (Value * Math.PI) / 180;
}

//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
export function calcCrow(lat1: number, lon1: number, lat2: number, lon2: number) {
  var EARTH_RADIUS_KM = 6371; // km
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var lat1 = toRad(lat1);
  var lat2 = toRad(lat2);

  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = EARTH_RADIUS_KM * c;
  return d;
}

// https://stackoverflow.com/a/6853926/2988432
export function pDistance(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0)
    //in case of 0 length line
    param = dot / len_sq;

  var xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return {
    point: {
      lat: xx,
      lon: yy,
    },
    distance: Math.sqrt(dx * dx + dy * dy),
  };
}
