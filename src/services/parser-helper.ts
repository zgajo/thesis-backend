import polylabel from "polylabel";
import { IOsmNode, IOsmWay, TPointsToNode } from "../types/osm-read";
import { greatCircleVec } from "../utils/distance";
import { SuperMap } from "./parser-storage";

export class NodeHelper {
  static increaseLinkCount(node: IOsmNode) {
    if (!node.linkCount) node.linkCount = 0;
    if (!node.street_count) node.street_count = 0;
    node.linkCount += 1;
    node.street_count += 1;
  }

  static connectNodes(previous: IOsmNode, next: IOsmNode, highway: string = "", oneWay: boolean = false, way: IOsmWay) {
    const distance: number = greatCircleVec(previous.lat, previous.lon, next.lat, next.lon);

    const previousPointsToNode: TPointsToNode = {
      nodeId: next.id,
      node: next,
      highway,
      distance,
      way,
    };

    previous.pointsToNode ? previous.pointsToNode.push(previousPointsToNode) : (previous.pointsToNode = [previousPointsToNode]);

    // previous.linkCount += 1;
    // previous.street_count += 1;
    if (!oneWay) {
      const nextPointsToNode: TPointsToNode = {
        nodeId: previous.id,
        node: previous,
        highway,
        distance,
        way,
      };
      next.pointsToNode ? next.pointsToNode.push(nextPointsToNode) : (next.pointsToNode = [nextPointsToNode]);
    }
  }
}

export class WayHelper {
  static addNode(way: IOsmWay, node: IOsmNode) {
    way.nodes ? way.nodes.push(node) : (way.nodes = [node]);
  }
  static setCenterOfPolygon(way: IOsmWay, nodes: SuperMap) {
    const polygon = way.nodeRefs.map(ref => {
      const node = nodes.get(ref);
      return [node?.lat || 0, node?.lon || 0];
    });
    var p = polylabel([polygon], 1.0);

    way.lat = p[0];
    way.lon = p[1];
  }
}

const highwaysNotForDriving = [
  "abandoned",
  "bridleway",
  "bus_guideway",
  "construction",
  "corridor",
  "cycleway",
  "elevator",
  "escalator",
  "footway",
  "path",
  "pedestrian",
  "planned",
  "platform",
  "proposed",
  "raceway",
  "service",
  "steps",
  "track",
];
const servicesNotForDriving = ["alley", "driveway", "emergency_access", "parking", "parking_aisle", "private"];
const highwaysNotForWalking = ["abandoned", "bus_guideway", "construction", "cycleway", "motor", "planned", "platform", "proposed", "raceway"];
const highwaysNotForBike = [
  "abandoned",
  "bus_guideway",
  "construction",
  "corridor",
  "elevator",
  "escalator",
  "footway",
  "motor",
  "planned",
  "platform",
  "proposed",
  "raceway",
  "steps",
];

/**
   *   driving: filter out un-drivable roads, service roads, private ways, and
  anything specifying motor=no. also filter out any non-service roads that
  are tagged as providing certain services
   * @param way 
   * @returns 
  */
export function isForDriving(way: IOsmWay) {
  return (
    way.tags?.highway &&
    way.tags?.area !== "yes" &&
    !highwaysNotForDriving.includes(way.tags?.highway) &&
    !servicesNotForDriving.includes(way.tags?.highway) &&
    way.tags?.motor_vehicle !== "no" &&
    way.tags?.motorcar !== "no"
  );
}
/**
     * walking: filter out cycle ways, motor ways, private ways, and anything
     specifying foot=no. allow service roads, permitting things like parking
     lot lanes, alleys, etc that you *can* walk on even if they're not
     exactly pleasant walks. some cycleways may allow pedestrians, but this
     filter ignores such cycleways.
     * @param way 
     * @returns 
     */
export function isForWalking(way: IOsmWay) {
  return (
    way.tags?.highway &&
    way.tags?.area !== "yes" &&
    !highwaysNotForWalking.includes(way.tags?.highway) &&
    way.tags?.foot !== "no" &&
    way.tags?.service !== "private"
  );
}

/**
       * biking: filter out foot ways, motor ways, private ways, and anything
       specifying biking=no
       * @param way 
       */
export function isForBike(way: IOsmWay) {
  return (
    way.tags?.highway &&
    way.tags?.area !== "yes" &&
    !highwaysNotForBike.includes(way.tags?.highway) &&
    way.tags?.bicycle !== "no" &&
    way.tags?.service !== "private"
  );
}

export function isWayToNavigate (way: IOsmWay) {
  return isForDriving(way) || isForWalking(way)
}

const knotsToKph = (knots: number) => {
  const kph = Math.round(knots * 1.852)

  return kph
}


const milesToKph = (miles: number) => {
  const kph = Math.round(miles * 1.60934)

  return kph
}



export function speedTransformer(maxspeed: string | undefined){
  if(!maxspeed) return 

  if(maxspeed === "walk") return 6

  if(!maxspeed.includes(" ")) return Number(maxspeed)

  const speed = maxspeed.split(" ")

  if(speed[1] === "mph") return milesToKph(Number(speed[0]))
  if(speed[1] === "knots") return knotsToKph(Number(speed[0]))
}