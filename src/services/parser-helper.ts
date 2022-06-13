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

    const previousPointsToNode: TPointsToNode = [
      next.id,
      next, 
      highway, 
      distance,
      way
    ]

    previous.pointsToNode 
      ? previous.pointsToNode.push(previousPointsToNode) 
      : (previous.pointsToNode = [previousPointsToNode]);

    // previous.linkCount += 1;
    // previous.street_count += 1;
    if (!oneWay) {
      const nextPointsToNode: TPointsToNode = [
        next.id,
        next, 
        highway, 
        distance,
        way
      ]
      next.pointsToNode 
        ? next.pointsToNode.push(nextPointsToNode) 
        : (next.pointsToNode = [nextPointsToNode]);
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

